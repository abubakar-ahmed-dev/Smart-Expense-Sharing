import { prisma } from '../lib/db.js';
import { CreateExpenseInput } from '../lib/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { expenseRepository } from '../repositories/expenseRepository.js';
import { getSplitStrategy } from './splitStrategies.js';

export class ExpenseService {
  async listGroupExpenses(groupId: string) {
    await this.assertGroupExists(groupId);
    return expenseRepository.findGroupExpenses(groupId);
  }

  async getGroupExpenseById(groupId: string, expenseId: string) {
    await this.assertGroupExists(groupId);

    const expense = await expenseRepository.findGroupExpenseById(groupId, expenseId);
    if (!expense) {
      throw new AppError('EXPENSE_NOT_FOUND', 'Expense not found', 404);
    }

    return expense;
  }

  async createExpense(groupId: string, input: CreateExpenseInput, requestingUserId: string) {
    await this.assertGroupExists(groupId);

    await this.assertActiveMember(groupId, requestingUserId, 'Requesting user must be an active group member');
    await this.assertActiveMember(groupId, input.paidByUserId, 'Payer must be an active group member');

    const uniqueParticipants = this.ensureUniqueParticipants(input.participants);
    await this.assertAllParticipantsAreActiveMembers(groupId, uniqueParticipants);

    const strategy = getSplitStrategy(input.splitType);
    const shares = strategy.computeShares({
      totalAmount: input.totalAmount,
      participants: uniqueParticipants,
    });

    const totalShares = shares.reduce((acc, item) => acc + item.amountOwed, 0);
    if (totalShares !== input.totalAmount) {
      throw new AppError(
        'INVALID_SPLIT_TOTAL',
        'Split shares must total the expense amount',
        400,
        { expected: input.totalAmount, actual: totalShares },
      );
    }

    return prisma.$transaction((tx) =>
      expenseRepository.createExpenseWithShares(
        tx,
        {
          groupId,
          paidByUserId: input.paidByUserId,
          totalAmount: input.totalAmount,
          currency: input.currency,
          description: input.description,
          splitType: input.splitType,
        },
        shares,
      ),
    );
  }

  private ensureUniqueParticipants(participants: CreateExpenseInput['participants']) {
    const seen = new Set<string>();

    for (const participant of participants) {
      if (seen.has(participant.userId)) {
        throw new AppError('DUPLICATE_PARTICIPANT', 'Duplicate participant userId found', 400, {
          userId: participant.userId,
        });
      }
      seen.add(participant.userId);
    }

    return participants;
  }

  private async assertGroupExists(groupId: string) {
    const group = await expenseRepository.findGroupById(groupId);
    if (!group) {
      throw new AppError('GROUP_NOT_FOUND', 'Group not found', 404);
    }
  }

  private async assertActiveMember(groupId: string, userId: string, message: string) {
    const member = await expenseRepository.findActiveGroupMember(groupId, userId);
    if (!member) {
      throw new AppError('INVALID_GROUP_MEMBER', message, 400, { userId, groupId });
    }
  }

  private async assertAllParticipantsAreActiveMembers(groupId: string, participants: CreateExpenseInput['participants']) {
    const participantIds = participants.map((participant) => participant.userId);
    const activeMembers = await expenseRepository.findActiveGroupMembersByUserIds(groupId, participantIds);
    const activeSet = new Set(activeMembers.map((member) => member.userId));

    const invalidParticipants = participantIds.filter((userId) => !activeSet.has(userId));
    if (invalidParticipants.length > 0) {
      throw new AppError(
        'INVALID_PARTICIPANTS',
        'All participants must be active members of the group',
        400,
        { invalidParticipants },
      );
    }
  }
}

export const expenseService = new ExpenseService();
