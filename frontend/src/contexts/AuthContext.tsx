import { create } from 'zustand';
import { authApi, LoginData, RegisterData } from '../services/api';
import { socketService } from '../services/socket';

interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  status: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: false,

  login: async (data: LoginData) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login(data);
      const { user, token } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, token, isAuthenticated: true, isLoading: false });

      // Connect to WebSocket
      socketService.connect(token);
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true });
    try {
      const response = await authApi.register(data);
      const { user, token } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, token, isAuthenticated: true, isLoading: false });

      // Connect to WebSocket
      socketService.connect(token);
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socketService.disconnect();
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    set({ isLoading: true });
    try {
      const response = await authApi.getMe();
      const user = response.data.data;

      set({ user, token, isAuthenticated: true, isLoading: false });

      // Connect to WebSocket
      socketService.connect(token);
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (user: User) => {
    set({ user });
    localStorage.setItem('user', JSON.stringify(user));
  }
}));
