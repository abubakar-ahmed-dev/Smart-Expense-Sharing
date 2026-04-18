import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { userService } from '../services/userService.js';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId[0];
    const user = await userService.getUserById(userId);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId[0];
    const user = await userService.updateUser(userId, req.body);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAccountDeletionStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId[0];
    if (!req.user || req.user.id !== userId) {
      throw new AppError('FORBIDDEN', 'You can only view your own account status', 403);
    }

    const status = await userService.getAccountDeletionStatus(userId);
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId[0];
    if (!req.user || req.user.id !== userId) {
      throw new AppError('FORBIDDEN', 'You can only delete your own account', 403);
    }
    const user = await userService.deleteUser(userId);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// Phone management endpoints
export async function addPhoneNumber(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId[0];
    const phone = await userService.addPhoneNumber(userId, req.body);
    res.status(201).json({
      success: true,
      data: phone,
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePhoneNumber(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId[0];
    const phoneId = typeof req.params.phoneId === 'string' ? req.params.phoneId : req.params.phoneId[0];
    const phone = await userService.updatePhoneNumber(userId, phoneId, req.body);
    res.status(200).json({
      success: true,
      data: phone,
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePhoneNumber(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId[0];
    const phoneId = typeof req.params.phoneId === 'string' ? req.params.phoneId : req.params.phoneId[0];
    const phone = await userService.deletePhoneNumber(userId, phoneId);
    res.status(200).json({
      success: true,
      data: phone,
    });
  } catch (error) {
    next(error);
  }
}

export async function listPhoneNumbers(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId[0];
    const phones = await userService.listPhoneNumbers(userId);
    res.status(200).json({
      success: true,
      data: phones,
    });
  } catch (error) {
    next(error);
  }
}
