import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.js';

/**
 * Mock authentication middleware for MVP.
 * In production, replace with JWT or OAuth validation.
 * Expects header: X-User-ID (user CUID)
 * Optional header: X-User-Role (ADMIN | MEMBER, defaults to MEMBER)
 */
export interface AuthUser {
  id: string;
  role: 'ADMIN' | 'MEMBER';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function mockAuth(req: Request, _res: Response, next: NextFunction) {
  const userId = req.header('x-user-id');

  if (!userId) {
    return next(new AppError('UNAUTHORIZED', 'X-User-ID header is required', 401));
  }

  const role = (req.header('x-user-role') as 'ADMIN' | 'MEMBER') ?? 'MEMBER';

  if (!['ADMIN', 'MEMBER'].includes(role)) {
    return next(new AppError('UNAUTHORIZED', 'Invalid X-User-Role', 401));
  }

  req.user = { id: userId, role };
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(
      new AppError('FORBIDDEN', 'Admin role is required for this action', 403),
    );
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('UNAUTHORIZED', 'Authentication is required', 401));
  }
  next();
}
