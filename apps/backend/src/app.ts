import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import passport from './config/passport';

import { env } from './config/env';
import logger from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Import routes
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import billingRoutes from './routes/billing';
import adminRoutes from './routes/admin';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: env.ALLOWED_ORIGINS,
  credentials: true,
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Body parsing middleware
// Raw body for Stripe webhooks
app.use('/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message) } }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: env.NODE_ENV
  });
});

// API routes
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/billing', billingRoutes);
app.use('/admin', adminRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;