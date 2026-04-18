import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface CreateExpenseData {
  groupId: string;
  paidByUserId: string;
  totalAmount: number;
  currency: string;
  description: string;
  splitType: 'EQUAL' | 'EXACT' | 'PERCENTAGE';
}

export interface CreateExpenseShareData {
  userId: string;
  amountOwed: number;
}

export class ExpenseRepository {
  async findGroupById(groupId: string) {
    return prisma.group.findUnique({
      where: { id: groupId },
    });
  }

  async findActiveGroupMember(groupId: string, userId: string) {
    return prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        isActive: true,
      },
    });
  }

  async findActiveGroupMembersByUserIds(groupId: string, userIds: string[]) {
    return prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { in: userIds },
        isActive: true,
      },
      select: {
        userId: true,
      },
    });
  }

  async createExpenseWithShares(
    tx: DbClient,
    expense: CreateExpenseData,
    shares: CreateExpenseShareData[],
  ) {
    return tx.expense.create({
      data: {
        ...expense,
        shares: {
          create: shares,
        },
      },
      include: {
        paidBy: true,
        shares: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findGroupExpenses(groupId: string) {
    return prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: true,
        shares: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findGroupExpenseById(groupId: string, expenseId: string) {
    return prisma.expense.findFirst({
      where: {
        id: expenseId,
        groupId,
      },
      include: {
        paidBy: true,
        shares: {
          include: {
            user: true,
          },
        },
      },
    });
  }
}

export const expenseRepository = new ExpenseRepository();
