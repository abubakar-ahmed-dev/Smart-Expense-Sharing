import { NextFunction, Request, Response } from 'express';
import { ApiErrorResponse } from '../types/api.js';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError('NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`, 404));
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  void _next;
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code: err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR',
      message: err instanceof Error ? err.message : 'Unexpected error occurred',
      details: err instanceof AppError ? err.details : undefined,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      requestId: req.header('x-request-id') ?? undefined,
    },
  };

  res.status(statusCode).json(payload);
};
