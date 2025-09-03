import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import logger from '../config/logger';
import { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError, 
  RateLimitError,
  createErrorResponse 
} from '@fluxo/shared';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Handle known application errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(
      createErrorResponse(error.message, error.code)
    );
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    switch ((error as any).code) {
      case 'P2002':
        return res.status(409).json(
          createErrorResponse('A record with this data already exists', 'UNIQUE_CONSTRAINT_VIOLATION')
        );
      case 'P2025':
        return res.status(404).json(
          createErrorResponse('Record not found', 'RECORD_NOT_FOUND')
        );
      default:
        return res.status(500).json(
          createErrorResponse('Database error occurred', 'DATABASE_ERROR')
        );
    }
  }

  // Handle validation errors (Zod)
  if (error.name === 'ZodError') {
    return res.status(400).json(
      createErrorResponse('Validation failed', 'VALIDATION_ERROR')
    );
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json(
      createErrorResponse('Invalid token', 'INVALID_TOKEN')
    );
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json(
      createErrorResponse('Token expired', 'TOKEN_EXPIRED')
    );
  }

  // Default error
  res.status(500).json(
    createErrorResponse('Internal server error', 'INTERNAL_ERROR')
  );
};