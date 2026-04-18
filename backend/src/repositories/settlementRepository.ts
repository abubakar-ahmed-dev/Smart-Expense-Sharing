import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface CreateSettlementData {
  id?: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export class SettlementRepository {
  async findGroupById(groupId: string) {
    return prisma.group.findUnique({ where: { id: groupId } });
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

  async findById(id: string) {
    return prisma.settlement.findUnique({
      where: { id },
      include: {
        fromUser: true,
        toUser: true,
      },
    });
  }

  async findByGroupAndId(groupId: string, settlementId: string) {
    return prisma.settlement.findFirst({
      where: {
        id: settlementId,
        groupId,
      },
      include: {
        fromUser: true,
        toUser: true,
      },
    });
  }

  async findByGroup(groupId: string) {
    return prisma.settlement.findMany({
      where: { groupId },
      include: {
        fromUser: true,
        toUser: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tx: DbClient, data: CreateSettlementData) {
    return tx.settlement.create({
      data,
      include: {
        fromUser: true,
        toUser: true,
      },
    });
  }
}

export const settlementRepository = new SettlementRepository();
