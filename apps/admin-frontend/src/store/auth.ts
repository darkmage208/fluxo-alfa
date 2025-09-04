import { create } from 'zustand';
import { authApi, setTokens, clearTokens, hasTokens } from '@/lib/api';
import type { User } from '@shared/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen for auth failure events
  if (typeof window !== 'undefined') {
    window.addEventListener('auth-failed', () => {
      clearTokens();
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
        clearTokens();
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