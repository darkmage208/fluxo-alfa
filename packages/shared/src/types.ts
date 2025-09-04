import { z } from 'zod';

// User Types
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
  isActive: z.boolean(),
  createdAt: z.date(),
  googleId: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

// Auth Types
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenSchema>;

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Chat Types
export const ChatThreadSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  createdAt: z.date(),
});

export type ChatThread = z.infer<typeof ChatThreadSchema>;

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  tokensInput: z.number().int().min(0),
  tokensOutput: z.number().int().min(0),
  costUsd: z.number().min(0),
  createdAt: z.date(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const CreateMessageSchema = z.object({
  threadId: z.string().uuid(),
  content: z.string().min(1),
});

export type CreateMessageRequest = z.infer<typeof CreateMessageSchema>;

// Subscription Types
export const PlanSchema = z.object({
  id: z.enum(['free', 'pro']),
  dailyChatLimit: z.number().int().nullable(),
  stripePriceId: z.string().nullable(),
});

export type Plan = z.infer<typeof PlanSchema>;

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid']),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  currentPeriodEnd: z.date().nullable(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

// RAG Types
export const SourceSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  rawText: z.string(),
  tags: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Source = z.infer<typeof SourceSchema>;

export const CreateSourceSchema = z.object({
  title: z.string().min(1),
  rawText: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export type CreateSourceRequest = z.infer<typeof CreateSourceSchema>;

export const UpdateSourceSchema = z.object({
  title: z.string().min(1).optional(),
  rawText: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateSourceRequest = z.infer<typeof UpdateSourceSchema>;

export const SourceChunkSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  chunkIndex: z.number().int().min(0),
  text: z.string(),
});

export type SourceChunk = z.infer<typeof SourceChunkSchema>;

// Usage Types
export const DailyUsageSchema = z.object({
  userId: z.string().uuid(),
  date: z.date(),
  chatsCount: z.number().int().min(0),
});

export type DailyUsage = z.infer<typeof DailyUsageSchema>;

// Admin Types
export const AdminMetricsSchema = z.object({
  totalUsers: z.number().int().min(0),
  activeUsers: z.number().int().min(0),
  totalSubscriptions: z.number().int().min(0),
  activeSubscriptions: z.number().int().min(0),
  freeUsers: z.number().int().min(0),
  proUsers: z.number().int().min(0),
  totalChats: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
  totalCost: z.number().min(0),
  dailyActiveUsers: z.number().int().min(0),
  totalRevenue: z.number().min(0),
  todayRevenue: z.number().min(0),
  todayTotalCosts: z.number().min(0),
});

export type AdminMetrics = z.infer<typeof AdminMetricsSchema>;

export const UserUsageStatsSchema = z.object({
  userId: z.string().uuid(),
  totalChats: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
  totalCost: z.number().min(0),
  last30DaysChats: z.number().int().min(0),
  todayChats: z.number().int().min(0),
});

export type UserUsageStats = z.infer<typeof UserUsageStatsSchema>;

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Streaming Types
export interface StreamingMessage {
  type: 'chunk' | 'complete' | 'error';
  content?: string;
  messageId?: string;
  error?: string;
}

// Billing Types
export const CreateCheckoutSessionSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CreateCheckoutSessionRequest = z.infer<typeof CreateCheckoutSessionSchema>;

// Password Reset Types
export const RequestPasswordResetSchema = z.object({
  email: z.string().email(),
});

export type RequestPasswordResetRequest = z.infer<typeof RequestPasswordResetSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export type ResetPasswordRequest = z.infer<typeof ResetPasswordSchema>;

// Error Types
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export class SubscriptionError extends AppError {
  constructor(message: string) {
    super(message, 402, 'SUBSCRIPTION_ERROR');
  }
}