import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import logger from '../config/logger';
import { 
  AuthenticationError, 
  ValidationError, 
  NotFoundError,
  sanitizeUser,
  generateRandomString 
} from '@fluxo/shared';
import type { User, AuthResponse, CreateUserRequest, LoginRequest } from '@fluxo/shared';

export class AuthService {
  private readonly JWT_SECRET = env.JWT_SECRET;
  private readonly REFRESH_TOKEN_SECRET = env.REFRESH_TOKEN_SECRET;

  async register(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash,
          role: 'user',
          isActive: true,
        },
      });

      // Create default subscription
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: 'free',
          status: 'active',
        },
      });

      // Generate tokens
      const tokens = await this.generateTokens(user.id);

      logger.info(`User registered: ${user.email}`);

      return {
        user: sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user || !user.passwordHash) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AuthenticationError('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id);

      logger.info(`User logged in: ${user.email}`);

      return {
        user: sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.REFRESH_TOKEN_SECRET) as { userId: string };

      // Find session
      const session = await prisma.session.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!session) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await this.logout(refreshToken);
        throw new AuthenticationError('Refresh token expired');
      }

      // Check if user is active
      if (!session.user.isActive) {
        throw new AuthenticationError('Account is deactivated');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(session.user.id);

      // Remove old session
      await prisma.session.delete({
        where: { id: session.id },
      });

      return {
        user: sanitizeUser(session.user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: { refreshToken },
      });
      logger.info('User logged out');
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  async createGoogleUser(googleData: { 
    googleId: string; 
    email: string; 
    name?: string; 
  }): Promise<AuthResponse> {
    try {
      // Check if user exists by email
      let user = await prisma.user.findUnique({
        where: { email: googleData.email },
      });

      if (user) {
        // Link Google account if not already linked
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId: googleData.googleId },
          });
        }
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: googleData.email,
            googleId: googleData.googleId,
            role: 'user',
            isActive: true,
          },
        });

        // Create default subscription
        await prisma.subscription.create({
          data: {
            userId: user.id,
            planId: 'free',
            status: 'active',
          },
        });
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id);

      logger.info(`Google user authenticated: ${user.email}`);

      return {
        user: sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      logger.error('Google auth error:', error);
      throw error;
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if user exists
        return;
      }

      // Generate reset token
      const token = generateRandomString(64);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      // TODO: Send email with reset link
      logger.info(`Password reset requested for: ${email}`);
      
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const resetRequest = await prisma.passwordReset.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!resetRequest) {
        throw new ValidationError('Invalid or expired reset token');
      }

      if (resetRequest.expiresAt < new Date()) {
        throw new ValidationError('Reset token has expired');
      }

      if (resetRequest.usedAt) {
        throw new ValidationError('Reset token has already been used');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update user password
      await prisma.user.update({
        where: { id: resetRequest.userId },
        data: { passwordHash },
      });

      // Mark token as used
      await prisma.passwordReset.update({
        where: { id: resetRequest.id },
        data: { usedAt: new Date() },
      });

      // Invalidate all sessions for this user
      await prisma.session.deleteMany({
        where: { userId: resetRequest.userId },
      });

      logger.info(`Password reset completed for user: ${resetRequest.user.email}`);
    } catch (error) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      return user ? sanitizeUser(user) : null;
    } catch (error) {
      logger.error('Get user by ID error:', error);
      throw error;
    }
  }

  private async generateTokens(userId: string) {
    // Generate access token (24 hours)
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Generate refresh token (7 days)
    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      this.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // Store refresh token session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}