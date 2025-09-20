import { create } from 'zustand';
import { authApi, setTokens, clearTokens, hasTokens } from '@/lib/api';
import type { User } from '@shared/types';
import { useChatStore } from './chat';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Utility function to clear all application data
const clearAllApplicationData = () => {
  // Clear all localStorage data
  localStorage.clear();

  // Reset chat store to initial state
  useChatStore.setState({
    threads: [],
    currentThread: null,
    messages: [],
    isLoading: false,
    isStreaming: false,
    streamingMessage: '',
  });
};

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen for auth failure events
  if (typeof window !== 'undefined') {
    window.addEventListener('auth-failed', () => {
      // Clear all application data including all stores and localStorage
      clearAllApplicationData();
      set({ user: null, isAuthenticated: false, isLoading: false });
    });
  }

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (email: string, password: string) => {
      try {
        const response = await authApi.login({ email, password });
        setTokens(response.accessToken, response.refreshToken);
        set({ user: response.user, isAuthenticated: true });
      } catch (error) {
        throw error;
      }
    },

    register: async (email: string, password: string) => {
      try {
        const response = await authApi.register({ email, password });
        setTokens(response.accessToken, response.refreshToken);
        set({ user: response.user, isAuthenticated: true });
      } catch (error) {
        throw error;
      }
    },

    logout: async () => {
      try {
        await authApi.logout();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        // Clear all application data including all stores and localStorage
        clearAllApplicationData();
        set({ user: null, isAuthenticated: false });
      }
    },

    checkAuth: async () => {
      if (!hasTokens()) {
        set({ isLoading: false });
        return;
      }

      try {
        const user = await authApi.getCurrentUser();
        set({ user, isAuthenticated: true, isLoading: false });
      } catch (error) {
        clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },
  };
});