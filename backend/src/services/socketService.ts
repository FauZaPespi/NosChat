import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from '../models/Message';
import Conversation from '../models/Conversation';
import User from '../models/User';
import { logger } from '../config/logger';

interface AuthSocket extends Socket {
  userId?: string;
}

export class SocketService {
  private io: SocketIOServer;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    this.io.use((socket: AuthSocket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
        const decoded = jwt.verify(token, jwtSecret) as { userId: string };

        socket.userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthSocket) => {
      this.handleConnection(socket);
    });
  }

  private async handleConnection(socket: AuthSocket): Promise<void> {
    const userId = socket.userId!;

    // Track user socket
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket.id);

    // Update user status
    await User.findByIdAndUpdate(userId, {
      status: 'online',
      lastSeen: new Date()
    });

    // Emit user online status to all participants
    this.broadcastUserStatus(userId, 'online');

    logger.info(`User connected: ${userId} (${socket.id})`);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Handle send message
    socket.on('send_message', async (data) => {
      await this.handleSendMessage(socket, data);
    });

    // Handle typing events
    socket.on('typing_start', (data) => {
      this.handleTypingStart(socket, data);
    });

    socket.on('typing_stop', (data) => {
      this.handleTypingStop(socket, data);
    });

    // Handle message read
    socket.on('message_read', async (data) => {
      await this.handleMessageRead(socket, data);
    });

    // Handle join conversation
    socket.on('join_conversation', (data) => {
      socket.join(`conversation:${data.conversationId}`);
    });

    // Handle leave conversation
    socket.on('leave_conversation', (data) => {
      socket.leave(`conversation:${data.conversationId}`);
    });
  }

  private async handleDisconnection(socket: AuthSocket): Promise<void> {
    const userId = socket.userId!;

    // Remove socket from user's socket set
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socket.id);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);

        // Update user status to offline
        await User.findByIdAndUpdate(userId, {
          status: 'offline',
          lastSeen: new Date()
        });

        // Broadcast user offline status
        this.broadcastUserStatus(userId, 'offline');
      }
    }

    logger.info(`User disconnected: ${userId} (${socket.id})`);
  }

  private async handleSendMessage(socket: AuthSocket, data: any): Promise<void> {
    try {
      const userId = socket.userId!;
      const { conversationId, content, type, attachments, replyTo } = data;

      // Verify user is participant
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
      });

      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }

      // Create message
      const message = await Message.create({
        conversationId,
        senderId: userId,
        content,
        type: type || 'text',
        attachments,
        replyTo,
        status: 'sent'
      });

      // Populate sender info
      await message.populate('senderId', 'username displayName avatar');

      // Update conversation last message
      conversation.lastMessage = message._id as any;
      conversation.updatedAt = new Date();

      // Increment unread count for other participants
      conversation.participants.forEach((participantId: any) => {
        if (participantId.toString() !== userId) {
          const count = conversation.unreadCount.get(participantId.toString()) || 0;
          conversation.unreadCount.set(participantId.toString(), count + 1);
        }
      });

      await conversation.save();

      // Emit to sender
      socket.emit('message_sent', { message });

      // Emit to conversation room
      socket.to(`conversation:${conversationId}`).emit('new_message', { message });

      // Emit to all participant sockets
      conversation.participants.forEach((participantId: any) => {
        if (participantId.toString() !== userId) {
          this.emitToUser(participantId.toString(), 'new_message', { message });
        }
      });

      logger.info(`Message sent: ${message._id} in conversation: ${conversationId}`);
    } catch (error) {
      logger.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private handleTypingStart(socket: AuthSocket, data: any): void {
    const userId = socket.userId!;
    const { conversationId } = data;

    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      userId,
      conversationId,
      typing: true
    });
  }

  private handleTypingStop(socket: AuthSocket, data: any): void {
    const userId = socket.userId!;
    const { conversationId } = data;

    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      userId,
      conversationId,
      typing: false
    });
  }

  private async handleMessageRead(socket: AuthSocket, data: any): Promise<void> {
    try {
      const userId = socket.userId!;
      const { messageId, conversationId } = data;

      // Update message status
      const message = await Message.findByIdAndUpdate(
        messageId,
        { status: 'read' },
        { new: true }
      );

      if (!message) {
        return;
      }

      // Reset unread count for this user
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        conversation.unreadCount.set(userId, 0);
        await conversation.save();
      }

      // Emit to conversation room
      socket.to(`conversation:${conversationId}`).emit('message_read', {
        messageId,
        userId
      });

      logger.info(`Message read: ${messageId} by user: ${userId}`);
    } catch (error) {
      logger.error('Message read error:', error);
    }
  }

  private async broadcastUserStatus(userId: string, status: string): Promise<void> {
    try {
      // Get all conversations the user is part of
      const conversations = await Conversation.find({
        participants: userId
      });

      // Get all unique participants
      const participants = new Set<string>();
      conversations.forEach(conv => {
        conv.participants.forEach((p: any) => {
          const pId = p.toString();
          if (pId !== userId) {
            participants.add(pId);
          }
        });
      });

      // Emit to all participants
      participants.forEach(participantId => {
        this.emitToUser(participantId, 'user_status_changed', {
          userId,
          status
        });
      });
    } catch (error) {
      logger.error('Broadcast user status error:', error);
    }
  }

  private emitToUser(userId: string, event: string, data: any): void {
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}
