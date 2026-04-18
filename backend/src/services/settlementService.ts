import { prisma } from '../lib/db.js';
import { CreateSettlementInput } from '../lib/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { ledgerRepository } from '../repositories/ledgerRepository.js';
import { settlementRepository } from '../repositories/settlementRepository.js';
import { balanceService } from './balanceService.js';

export class SettlementService {
  async listGroupSettlements(groupId: string) {
    await this.assertGroupExists(groupId);
    return settlementRepository.findByGroup(groupId);
  }

  async getGroupSettlementById(groupId: string, settlementId: string) {
    await this.assertGroupExists(groupId);

    const settlement = await settlementRepository.findByGroupAndId(groupId, settlementId);
    if (!settlement) {
      throw new AppError('SETTLEMENT_NOT_FOUND', 'Settlement not found', 404);
    }

    return settlement;
  }

  async createSettlement(groupId: string, input: CreateSettlementInput, requestingUserId: string) {
    await this.assertGroupExists(groupId);

    if (input.fromUserId !== requestingUserId) {
      throw new AppError('FORBIDDEN', 'You can only record settlements for your own outgoing payments', 403);
    }

    if (input.fromUserId === input.toUserId) {
      throw new AppError('INVALID_SETTLEMENT', 'fromUserId and toUserId must be different users', 400);
    }

    await this.assertActiveMember(groupId, input.fromUserId, 'Settlement payer must be an active group member');
    await this.assertActiveMember(groupId, input.toUserId, 'Settlement receiver must be an active group member');

    const balances = await balanceService.getGroupPairBalances(groupId);
    const currentDebt = balances.find(
      (balance) =>
        balance.debtorUserId === input.fromUserId &&
        balance.creditorUserId === input.toUserId,
    );

    if (!currentDebt || currentDebt.netAmount <= 0) {
      throw new AppError('NO_OUTSTANDING_DEBT', 'No outstanding debt found for this settlement direction', 400);
    }

    if (input.amount > currentDebt.netAmount) {
      throw new AppError(
        'INVALID_SETTLEMENT_AMOUNT',
        'Settlement amount cannot exceed current outstanding debt',
        400,
        { outstandingDebt: currentDebt.netAmount, attemptedAmount: input.amount },
      );
    }

    const idempotentId = input.idempotencyKey
      ? this.buildIdempotentSettlementId(groupId, input.idempotencyKey)
      : undefined;

    if (idempotentId) {
      const existing = await settlementRepository.findById(idempotentId);
      if (existing) {
        return existing;
      }
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const settlement = await settlementRepository.create(tx, {
          id: idempotentId,
          groupId,
          fromUserId: input.fromUserId,
          toUserId: input.toUserId,
          amount: input.amount,
        });

        // Settlement reverses debt, so ledger direction is opposite of payment direction.
        await ledgerRepository.createMany(tx, [
          {
            groupId,
            eventType: 'SETTLEMENT',
            fromUserId: input.toUserId,
            toUserId: input.fromUserId,
            amount: input.amount,
            referenceId: settlement.id,
            settlementId: settlement.id,
          },
        ]);

        return settlement;
      });
    } catch (error) {
      if (idempotentId) {
        const existing = await settlementRepository.findById(idempotentId);
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  private async assertGroupExists(groupId: string) {
    const group = await settlementRepository.findGroupById(groupId);
    if (!group) {
      throw new AppError('GROUP_NOT_FOUND', 'Group not found', 404);
    }
  }

  private async assertActiveMember(groupId: string, userId: string, message: string) {
    const member = await settlementRepository.findActiveGroupMember(groupId, userId);
    if (!member) {
      throw new AppError('INVALID_GROUP_MEMBER', message, 400, { groupId, userId });
    }
  }

  private buildIdempotentSettlementId(groupId: string, key: string) {
    const normalized = `${groupId}:${key}`;
    const encoded = Buffer.from(normalized).toString('base64url');
    return `idem_${encoded.slice(0, 100)}`;
  }
}

export const settlementService = new SettlementService();
