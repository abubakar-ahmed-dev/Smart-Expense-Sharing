import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from './errorHandler.js';

export function validateRequest(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return next(
        new AppError(
          'VALIDATION_ERROR',
          'Request validation failed',
          400,
          fieldErrors,
        ),
      );
    }

    req.body = result.data;
    next();
  };
}

export function validatePathParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return next(
        new AppError(
          'VALIDATION_ERROR',
          'Path parameters validation failed',
          400,
          fieldErrors,
        ),
      );
    }

    req.params = result.data;
    next();
  };
}
