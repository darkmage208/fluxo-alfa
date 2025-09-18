import axios from 'axios';
import type { 
  AuthResponse, 
  CreateUserRequest, 
  LoginRequest, 
  CreateMessageRequest,
  CreateCheckoutSessionRequest,
  ApiResponse 
} from '@shared/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Auth token management
let accessToken: string | null = localStorage.getItem('accessToken');
let refreshToken: string | null = localStorage.getItem('refreshToken');

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
        
        setTokens(newAccessToken, newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        clearTokens();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

export const getAccessToken = () => accessToken;
export const hasTokens = () => !!(accessToken && refreshToken);

// Auth API
export const authApi = {
  register: async (data: CreateUserRequest): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data.data!;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return response.data.data!;
  },

  logout: async (): Promise<void> => {
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
    clearTokens();
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    await api.post('/auth/request-password-reset', { email });
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, password });
  },
};

// Chat API
export const chatApi = {
  createThread: async (title?: string) => {
    const response = await api.post('/chat/thread', { title });
    return response.data.data;
  },

  getThreads: async (page = 1, limit = 20) => {
    const response = await api.get('/chat/threads', {
      params: { page, limit },
    });
    return response.data;
  },

  getThreadMessages: async (threadId: string, page = 1, limit = 20, password?: string) => {
    const response = await api.get(`/chat/thread/${threadId}/messages`, {
      params: { page, limit, password },
    });
    return response.data;
  },

  deleteThread: async (threadId: string): Promise<void> => {
    await api.delete(`/chat/thread/${threadId}`);
  },

  renameThread: async (threadId: string, title: string): Promise<void> => {
    await api.patch(`/chat/thread/${threadId}`, { title });
  },

  sendMessage: (data: CreateMessageRequest) => {
    return new EventSource(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    } as any);
  },

  getStats: async () => {
    const response = await api.get('/chat/stats');
    return response.data.data;
  },

  // Password management
  setThreadPassword: async (threadId: string, password: string) => {
    const response = await api.post(`/chat/thread/${threadId}/password`, { password });
    return response.data;
  },

  verifyThreadPassword: async (threadId: string, password: string) => {
    const response = await api.post(`/chat/thread/${threadId}/verify-password`, { password });
    return response.data;
  },

  updateThreadPassword: async (threadId: string, currentPassword: string, newPassword: string) => {
    const response = await api.put(`/chat/thread/${threadId}/password`, { 
      currentPassword, 
      newPassword 
    });
    return response.data;
  },

  deleteThreadPassword: async (threadId: string, currentPassword: string) => {
    const response = await api.delete(`/chat/thread/${threadId}/password`, {
      data: { currentPassword }
    });
    return response.data;
  },
};

// Enhanced billing API with multi-gateway support
export const billingApi = {
  createCheckoutSession: async (data: {
    planId: string;
    gateway: 'stripe' | 'mercado_pago' | 'kiwify';
    returnUrl: string;
    cancelUrl: string;
    metadata?: Record<string, any>;
  }) => {
    const response = await api.post('/billing/checkout', data);
    return response.data.data;
  },

  getCustomerPortal: async (returnUrl?: string) => {
    const response = await api.get('/billing/portal', {
      params: { return_url: returnUrl },
    });
    return response.data.data;
  },

  getSubscription: async () => {
    const response = await api.get('/billing/subscription');
    return response.data.data;
  },

  cancelSubscription: async () => {
    const response = await api.post('/billing/cancel');
    return response.data.data;
  },

  getPaymentGateways: async () => {
    const response = await api.get('/billing/gateways');
    return response.data.data;
  },
};

export default api;