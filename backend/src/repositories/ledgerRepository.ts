import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface LedgerEntryCreateData {
  groupId: string;
  eventType: 'EXPENSE' | 'SETTLEMENT';
  fromUserId: string;
  toUserId: string;
  amount: number;
  referenceId: string;
  expenseId?: string;
  settlementId?: string;
}

export class LedgerRepository {
  async createMany(tx: DbClient, entries: LedgerEntryCreateData[]) {
    if (entries.length === 0) {
      return { count: 0 };
    }

    return tx.ledgerEntry.createMany({
      data: entries,
    });
  }

  async findByGroupId(groupId: string) {
    return prisma.ledgerEntry.findMany({
      where: { groupId },
      include: {
        fromUser: true,
        toUser: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const ledgerRepository = new LedgerRepository();
