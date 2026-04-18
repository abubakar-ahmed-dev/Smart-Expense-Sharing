import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { settlementService } from '../services/settlementService.js';

export async function listGroupSettlements(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const settlements = await settlementService.listGroupSettlements(groupId);

    res.status(200).json({
      success: true,
      data: settlements,
    });
  } catch (error) {
    next(error);
  }
}

export async function getGroupSettlementById(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const settlementId =
      typeof req.params.settlementId === 'string'
        ? req.params.settlementId
        : req.params.settlementId[0];

    const settlement = await settlementService.getGroupSettlementById(groupId, settlementId);

    res.status(200).json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    next(error);
  }
}

export async function createGroupSettlement(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', 'Authentication is required', 401);
    }

    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const settlement = await settlementService.createSettlement(groupId, req.body, req.user.id);

    res.status(201).json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    next(error);
  }
}
