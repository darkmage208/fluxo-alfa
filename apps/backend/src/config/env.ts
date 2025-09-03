import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('8000'),
  
  // Database
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_PUBLISHABLE_KEY: z.string(),
  STRIPE_PRICE_PRO: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  
  // OpenAI
  OPENAI_API_KEY: z.string(),
  EMBEDDING_MODEL: z.string().default('text-embedding-small'),
  EMBEDDING_DIM: z.string().transform(Number).default('1536'),
  INFERENCE_MODEL: z.string().default('gpt-4o'),
  
  // Pricing
  PRICING_JSON: z.string().transform((str, ctx) => {
    try {
      return JSON.parse(str);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
      return z.NEVER;
    }
  }),
  
  // CORS
  ALLOWED_ORIGINS: z.string().transform((str) => str.split(',')),
  
  // URLs
  USER_FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_FRONTEND_URL: z.string().url().default('http://localhost:3001'),
  BACKEND_URL: z.string().url().default('http://localhost:8000'),
  
  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    process.exit(1);
  }
}

export const env = validateEnv();