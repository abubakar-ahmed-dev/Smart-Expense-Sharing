import { AppError } from '../middleware/errorHandler.js';
import { ledgerRepository } from '../repositories/ledgerRepository.js';
import { settlementRepository } from '../repositories/settlementRepository.js';

export interface PairwiseBalance {
  debtorUserId: string;
  creditorUserId: string;
  netAmount: number;
}

export interface UserBalanceSummary {
  userId: string;
  totalOwed: number;
  totalReceivable: number;
  netBalance: number;
  owes: Array<{ userId: string; amount: number }>;
  owedBy: Array<{ userId: string; amount: number }>;
}

interface PairAccumulator {
  firstUserId: string;
  secondUserId: string;
  signedAmount: number;
}

interface BalanceEntry {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export class BalanceService {
  async getGroupPairBalances(groupId: string): Promise<PairwiseBalance[]> {
    await this.assertGroupExists(groupId);

    const entries = await ledgerRepository.findByGroupId(groupId);
    const pairMap = this.aggregatePairwise(entries);

    const balances: PairwiseBalance[] = [];
    for (const pair of pairMap.values()) {
      if (pair.signedAmount === 0) {
        continue;
      }

      if (pair.signedAmount > 0) {
        balances.push({
          debtorUserId: pair.firstUserId,
          creditorUserId: pair.secondUserId,
          netAmount: pair.signedAmount,
        });
      } else {
        balances.push({
          debtorUserId: pair.secondUserId,
          creditorUserId: pair.firstUserId,
          netAmount: Math.abs(pair.signedAmount),
        });
      }
    }

    return balances.sort((a, b) => b.netAmount - a.netAmount);
  }

  async getUserSummary(groupId: string, userId: string): Promise<UserBalanceSummary> {
    const member = await settlementRepository.findActiveGroupMember(groupId, userId);
    if (!member) {
      throw new AppError('INVALID_GROUP_MEMBER', 'User must be an active member of the group', 400, {
        groupId,
        userId,
      });
    }

    const balances = await this.getGroupPairBalances(groupId);

    const owes = balances
      .filter((balance) => balance.debtorUserId === userId)
      .map((balance) => ({ userId: balance.creditorUserId, amount: balance.netAmount }));

    const owedBy = balances
      .filter((balance) => balance.creditorUserId === userId)
      .map((balance) => ({ userId: balance.debtorUserId, amount: balance.netAmount }));

    const totalOwed = owes.reduce((sum, item) => sum + item.amount, 0);
    const totalReceivable = owedBy.reduce((sum, item) => sum + item.amount, 0);

    return {
      userId,
      totalOwed,
      totalReceivable,
      netBalance: totalReceivable - totalOwed,
      owes,
      owedBy,
    };
  }

  async getUserOutstandingDebt(userId: string): Promise<number> {
    const entries = await ledgerRepository.findByUserId(userId);
    const pairMap = this.aggregatePairwise(entries);

    let totalOwed = 0;
    for (const pair of pairMap.values()) {
      const debtorUserId = pair.signedAmount > 0 ? pair.firstUserId : pair.secondUserId;
      if (debtorUserId !== userId) {
        continue;
      }

      totalOwed += Math.abs(pair.signedAmount);
    }

    return totalOwed;
  }

  private async assertGroupExists(groupId: string) {
    const group = await settlementRepository.findGroupById(groupId);
    if (!group) {
      throw new AppError('GROUP_NOT_FOUND', 'Group not found', 404);
    }
  }

  private aggregatePairwise(entries: Array<BalanceEntry>) {
    const map = new Map<string, PairAccumulator>();

    for (const entry of entries) {
      const [firstUserId, secondUserId] =
        entry.fromUserId < entry.toUserId
          ? [entry.fromUserId, entry.toUserId]
          : [entry.toUserId, entry.fromUserId];

      const key = `${firstUserId}|${secondUserId}`;
      const existing = map.get(key) ?? {
        firstUserId,
        secondUserId,
        signedAmount: 0,
      };

      if (entry.fromUserId === firstUserId) {
        existing.signedAmount += entry.amount;
      } else {
        existing.signedAmount -= entry.amount;
      }

      map.set(key, existing);
    }

    return map;
  }
}

export const balanceService = new BalanceService();
