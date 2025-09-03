import axios from 'axios';
import type { ApiResponse, PaginatedResponse } from '@shared/types';
import { getAccessToken } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const adminApi = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  timeout: 30000,
});

// Request interceptor to add auth token
adminApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Admin API endpoints
export const adminApiService = {
  // Dashboard metrics
  getOverviewMetrics: async () => {
    const response = await adminApi.get('/metrics/overview');
    return response.data.data;
  },

  // User management
  getUsers: async (page = 1, limit = 50, search?: string) => {
    const response = await adminApi.get('/users', {
      params: { page, limit, search },
    });
    return response.data;
  },

  updateUser: async (userId: string, data: { isActive?: boolean; role?: string }) => {
    const response = await adminApi.patch(`/users/${userId}`, data);
    return response.data.data;
  },

  deleteUser: async (userId: string) => {
    await adminApi.delete(`/users/${userId}`);
  },

  getUserUsage: async (userId: string) => {
    const response = await adminApi.get(`/user/${userId}/usage`);
    return response.data.data;
  },

  // Subscription management
  getSubscriptions: async (page = 1, limit = 50) => {
    const response = await adminApi.get('/subscriptions', {
      params: { page, limit },
    });
    return response.data;
  },

  // RAG Sources management
  getSources: async (page = 1, limit = 20, search?: string) => {
    const response = await adminApi.get('/sources', {
      params: { page, limit, search },
    });
    return response.data;
  },

  createSource: async (data: { title: string; rawText: string; tags?: string[] }) => {
    const response = await adminApi.post('/sources', data);
    return response.data.data;
  },

  updateSource: async (sourceId: string, data: { title?: string; rawText?: string; tags?: string[]; isActive?: boolean }) => {
    const response = await adminApi.patch(`/sources/${sourceId}`, data);
    return response.data.data;
  },

  deleteSource: async (sourceId: string) => {
    await adminApi.delete(`/sources/${sourceId}`);
  },

  reprocessSources: async () => {
    const response = await adminApi.post('/sources/reprocess');
    return response.data;
  },

  getSourceStats: async () => {
    const response = await adminApi.get('/sources/stats');
    return response.data.data;
  },
};

export default adminApi;