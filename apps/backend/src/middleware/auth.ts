import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthService } from '../services/authService';

const authService = new AuthService();

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new Error('Access token required');
    }

    // Verify access token
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; type: string };

    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }

    // Get user data
    const user = await authService.getUserById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    (req as any).user = user;
    (req as any).userId = user.id;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new Error('Authentication required'));
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes((req as any).user?.role)) {
      return next(new Error('Insufficient permissions'));
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; type: string };
        
        if (payload.type === 'access') {
          const user = await authService.getUserById(payload.userId);
          if (user && user.isActive) {
            (req as any).user = user;
            (req as any).userId = user.id;
          }
        }
      } catch (error) {
        // Ignore token errors for optional auth
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};