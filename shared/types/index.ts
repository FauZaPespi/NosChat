// User Types
export interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  status: UserStatus;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy'
}

// Message Types
export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  attachments?: Attachment[];
  status: MessageStatus;
  replyTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  AUDIO = 'audio',
  VIDEO = 'video'
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export interface Attachment {
  url: string;
  type: string;
  name: string;
  size: number;
}

// Conversation Types
export interface Conversation {
  _id: string;
  participants: string[];
  type: ConversationType;
  name?: string;
  avatar?: string;
  lastMessage?: Message;
  unreadCount: { [userId: string]: number };
  createdAt: Date;
  updatedAt: Date;
}

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group'
}

// WebSocket Events
export enum SocketEvents {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',

  // Authentication
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',

  // Messages
  SEND_MESSAGE = 'send_message',
  MESSAGE_SENT = 'message_sent',
  NEW_MESSAGE = 'new_message',
  MESSAGE_DELIVERED = 'message_delivered',
  MESSAGE_READ = 'message_read',

  // Typing
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',
  USER_TYPING = 'user_typing',

  // User Status
  USER_STATUS_CHANGED = 'user_status_changed',

  // Conversations
  CONVERSATION_CREATED = 'conversation_created',
  CONVERSATION_UPDATED = 'conversation_updated',

  // Errors
  ERROR = 'error'
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
