import { NextFunction, Request, Response } from 'express';
import { expenseService } from '../services/expenseService.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listGroupExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const expenses = await expenseService.listGroupExpenses(groupId);

    res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
}

export async function getGroupExpenseById(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const expenseId = typeof req.params.expenseId === 'string' ? req.params.expenseId : req.params.expenseId[0];
    const expense = await expenseService.getGroupExpenseById(groupId, expenseId);

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
}

export async function createGroupExpense(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', 'Authentication is required', 401);
    }

    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const expense = await expenseService.createExpense(groupId, req.body, req.user.id);

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
}
