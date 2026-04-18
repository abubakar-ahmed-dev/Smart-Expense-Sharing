import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.js';
import { verifyAuthToken } from '../lib/security.js';
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function mockAuth(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.header('authorization');
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    const payload = verifyAuthToken(token);

    if (!payload) {
      return next(new AppError('UNAUTHORIZED', 'Invalid or expired authorization token', 401));
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: 'MEMBER',
    };
    return next();
  }

  const userId = req.header('x-user-id');

  if (!userId) {
    return next(new AppError('UNAUTHORIZED', 'Authorization token or X-User-ID header is required', 401));
  }

  const role = (req.header('x-user-role') as 'ADMIN' | 'MEMBER') ?? 'MEMBER';

  if (!['ADMIN', 'MEMBER'].includes(role)) {
    return next(new AppError('UNAUTHORIZED', 'Invalid X-User-Role', 401));
  }

  req.user = { id: userId, email: userId, name: userId, role };
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
