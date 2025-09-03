import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import passport from '../config/passport';
import { AuthService } from '../services/authService';
import { authenticateToken } from '../middleware/auth';
import { env } from '../config/env';
import { 
  CreateUserSchema, 
  LoginSchema, 
  RefreshTokenSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  createSuccessResponse,
  ValidationError,
  RATE_LIMITS 
} from '@fluxo/shared';

const router = Router();
const authService = new AuthService();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH.windowMs,
  max: RATE_LIMITS.AUTH.max,
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all auth routes
router.use(authLimiter);

// Validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      next(new ValidationError('Invalid request data'));
    }
  };
};

// @route   POST /auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateRequest(CreateUserSchema), async (req, res, next) => {
  try {
    const authResponse = await authService.register(req.body);
    res.status(201).json(createSuccessResponse(authResponse, 'User registered successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   POST /auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateRequest(LoginSchema), async (req, res, next) => {
  try {
    const authResponse = await authService.login(req.body);
    res.json(createSuccessResponse(authResponse, 'Login successful'));
  } catch (error) {
    next(error);
  }
});

// @route   POST /auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', validateRequest(RefreshTokenSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const authResponse = await authService.refreshToken(refreshToken);
    res.json(createSuccessResponse(authResponse, 'Token refreshed successfully'));
  } catch (error) {
    next(error);
  }
});

// @route   POST /auth/logout
// @desc    Logout user
// @access  Public
router.post('/logout', validateRequest(RefreshTokenSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.json(createSuccessResponse(null, 'Logout successful'));
  } catch (error) {
    next(error);
  }
});

// @route   POST /auth/request-password-reset
// @desc    Request password reset
// @access  Public
router.post('/request-password-reset', validateRequest(RequestPasswordResetSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.requestPasswordReset(email);
    res.json(createSuccessResponse(null, 'Password reset email sent if account exists'));
  } catch (error) {
    next(error);
  }
});

// @route   POST /auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', validateRequest(ResetPasswordSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    res.json(createSuccessResponse(null, 'Password reset successful'));
  } catch (error) {
    next(error);
  }
});

// @route   GET /auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    res.json(createSuccessResponse(req.user, 'User data retrieved'));
  } catch (error) {
    next(error);
  }
});

// Google OAuth routes (only if configured)
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  // @route   GET /auth/google
  // @desc    Start Google OAuth flow
  // @access  Public
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  // @route   GET /auth/google/callback
  // @desc    Google OAuth callback
  // @access  Public
  router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth' }),
    (req: Request, res: Response) => {
      try {
        const authResponse = req.user as any;
        
        // Redirect to frontend with tokens
        const redirectUrl = new URL('/auth/callback', env.USER_FRONTEND_URL);
        redirectUrl.searchParams.set('accessToken', authResponse.accessToken);
        redirectUrl.searchParams.set('refreshToken', authResponse.refreshToken);
        
        res.redirect(redirectUrl.toString());
      } catch (error) {
        res.redirect(`${env.USER_FRONTEND_URL}/login?error=oauth`);
      }
    }
  );
}

export default router;