import { create } from 'zustand';
import { conversationApi } from '../services/api';
import { socketService } from '../services/socket';

interface Message {
  _id: string;
  conversationId: string;
  senderId: any;
  content: string;
  type: string;
  status: string;
  createdAt: string;
}

interface Conversation {
  _id: string;
  participants: any[];
  type: string;
  name?: string;
  avatar?: string;
  lastMessage?: Message;
  unreadCount: { [key: string]: number };
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  typingUsers: Set<string>;
  isLoading: boolean;
  loadConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  createConversation: (participantIds: string[], type?: string) => Promise<string>;
  setTyping: (userId: string, isTyping: boolean) => void;
  clearCurrentConversation: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  typingUsers: new Set(),
  isLoading: false,

  loadConversations: async () => {
    set({ isLoading: true });
    try {
      const response = await conversationApi.getConversations();
      set({ conversations: response.data.data, isLoading: false });
    } catch (error) {
      console.error('Failed to load conversations:', error);
      set({ isLoading: false });
    }
  },

  selectConversation: async (conversationId: string) => {
    const conversation = get().conversations.find(c => c._id === conversationId);
    if (conversation) {
      set({ currentConversation: conversation, messages: [] });
      await get().loadMessages(conversationId);
      socketService.joinConversation(conversationId);
    }
  },

  loadMessages: async (conversationId: string) => {
    set({ isLoading: true });
    try {
      const response = await conversationApi.getMessages(conversationId);
      set({ messages: response.data.data, isLoading: false });
    } catch (error) {
      console.error('Failed to load messages:', error);
      set({ isLoading: false });
    }
  },

  sendMessage: (conversationId: string, content: string) => {
    socketService.sendMessage({
      conversationId,
      content,
      type: 'text'
    });
  },

  addMessage: (message: Message) => {
    set(state => ({
      messages: [...state.messages, message]
    }));

    // Update conversation last message
    set(state => ({
      conversations: state.conversations.map(conv =>
        conv._id === message.conversationId
          ? { ...conv, lastMessage: message, updatedAt: message.createdAt }
          : conv
      )
    }));
  },

  updateMessage: (messageId: string, updates: Partial<Message>) => {
    set(state => ({
      messages: state.messages.map(msg =>
        msg._id === messageId ? { ...msg, ...updates } : msg
      )
    }));
  },

  createConversation: async (participantIds: string[], type = 'direct') => {
    try {
      const response = await conversationApi.createConversation({
        participantIds,
        type
      });
      const conversation = response.data.data;

      set(state => ({
        conversations: [conversation, ...state.conversations]
      }));

      return conversation._id;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create conversation');
    }
  },

  setTyping: (userId: string, isTyping: boolean) => {
    set(state => {
      const newTypingUsers = new Set(state.typingUsers);
      if (isTyping) {
        newTypingUsers.add(userId);
      } else {
        newTypingUsers.delete(userId);
      }
      return { typingUsers: newTypingUsers };
    });
  },

  clearCurrentConversation: () => {
    const current = get().currentConversation;
    if (current) {
      socketService.leaveConversation(current._id);
    }
    set({ currentConversation: null, messages: [], typingUsers: new Set() });
  }
}));
