import { NextFunction, Request, Response } from 'express';
import { balanceService } from '../services/balanceService.js';

export async function getGroupBalances(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const balances = await balanceService.getGroupPairBalances(groupId);

    res.status(200).json({
      success: true,
      data: balances,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserBalanceSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const userId = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId[0];
    const summary = await balanceService.getUserSummary(groupId, userId);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}
