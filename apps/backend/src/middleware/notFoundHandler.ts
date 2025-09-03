import { Request, Response } from 'express';
import { createErrorResponse } from '@fluxo/shared';

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json(
    createErrorResponse(`Route ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND')
  );
};