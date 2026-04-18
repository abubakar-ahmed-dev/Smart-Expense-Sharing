import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await authService.login(req.body);
    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
}

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await authService.signup(req.body);
    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
}
