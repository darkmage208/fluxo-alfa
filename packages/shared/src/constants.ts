export const PLANS = {
  FREE: 'free',
  PRO: 'pro',
} as const;

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing',
  UNPAID: 'unpaid',
} as const;

export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
} as const;

export const STREAMING_MESSAGE_TYPES = {
  CHUNK: 'chunk',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const;

export const DEFAULT_LIMITS = {
  FREE_DAILY_CHATS: 10,
  MAX_MESSAGE_LENGTH: 4000,
  MAX_THREAD_TITLE_LENGTH: 100,
  MAX_SOURCE_TITLE_LENGTH: 200,
  MAX_CHUNK_SIZE: 1000,
  CHUNK_OVERLAP: 100,
  MAX_SEARCH_RESULTS: 5,
} as const;

export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '7d',
  PASSWORD_RESET: '1h',
} as const;

export const RATE_LIMITS = {
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts (increased for development)
  },
  CHAT: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 messages
  },
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const CORS_ORIGINS = {
  DEVELOPMENT: ['http://localhost:3000', 'http://localhost:3001'],
  PRODUCTION: [], // To be set via environment variables
} as const;

export const EMBEDDING_CONFIG = {
  MODEL: 'text-embedding-small',
  DIMENSIONS: 1536,
  MAX_INPUT_LENGTH: 8192,
} as const;

export const AI_CONFIG = {
  MODEL: 'gpt-4o',
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  SYSTEM_PROMPT: `You are an AI assistant that provides helpful, accurate, and contextual responses based on the provided context. 

When responding:
1. Use the provided context to inform your answers
2. Be concise and direct
3. If the context doesn't contain enough information, acknowledge this
4. Maintain a helpful and professional tone
5. Do not make up information not present in the context`,
} as const;

export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;