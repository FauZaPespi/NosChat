import { Response } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../config/logger';

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'username displayName avatar status')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    logger.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations'
    });
  }
};

export const getConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    })
      .populate('participants', 'username displayName avatar status')
      .populate('lastMessage');

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
      return;
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    logger.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation'
    });
  }
};

export const createConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { participantIds, type, name } = req.body;
    const userId = req.userId;

    if (!participantIds || !Array.isArray(participantIds)) {
      res.status(400).json({
        success: false,
        error: 'Participant IDs are required'
      });
      return;
    }

    // Add current user to participants
    const allParticipants = [...new Set([userId, ...participantIds])];

    // Check if direct conversation already exists
    if (type === 'direct' && allParticipants.length === 2) {
      const existing = await Conversation.findOne({
        type: 'direct',
        participants: { $all: allParticipants, $size: 2 }
      });

      if (existing) {
        res.json({
          success: true,
          data: existing,
          message: 'Conversation already exists'
        });
        return;
      }
    }

    // Verify all participants exist
    const users = await User.find({ _id: { $in: allParticipants } });
    if (users.length !== allParticipants.length) {
      res.status(400).json({
        success: false,
        error: 'Some participants not found'
      });
      return;
    }

    // Create conversation
    const conversation = await Conversation.create({
      participants: allParticipants,
      type: type || 'direct',
      name
    });

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username displayName avatar status');

    res.status(201).json({
      success: true,
      data: populatedConversation,
      message: 'Conversation created successfully'
    });

    logger.info(`Conversation created: ${conversation._id}`);
  } catch (error) {
    logger.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation'
    });
  }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
      return;
    }

    const messages = await Message.find({ conversationId })
      .populate('senderId', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);

    res.json({
      success: true,
      data: messages.reverse()
    });
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    const userId = req.userId;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
      return;
    }

    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
      .select('username displayName avatar status')
      .limit(20);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
};
