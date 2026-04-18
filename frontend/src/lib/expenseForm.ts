import { CreateExpensePayload, SplitType } from './api';

export interface ExpenseParticipantDraft {
  userId: string;
  amount?: string;
  percentage?: string;
}

export interface ExpenseFormDraft {
  paidByUserId: string;
  totalAmount: string;
  currency: string;
  description: string;
  splitType: SplitType;
  participants: ExpenseParticipantDraft[];
}

export interface ExpenseFormValidation {
  ok: boolean;
  payload?: CreateExpensePayload;
  message?: string;
}

export function validateExpenseFormDraft(draft: ExpenseFormDraft): ExpenseFormValidation {
  const totalAmount = Number(draft.totalAmount);
  if (!Number.isInteger(totalAmount) || totalAmount <= 0) {
    return { ok: false, message: 'Total amount must be a positive integer (minor units).' };
  }

  if (!draft.description.trim()) {
    return { ok: false, message: 'Description is required.' };
  }

  if (!draft.paidByUserId) {
    return { ok: false, message: 'Payer is required.' };
  }

  if (draft.participants.length === 0) {
    return { ok: false, message: 'At least one participant is required.' };
  }

  const participants = draft.participants.map((participant) => {
    const normalized = {
      userId: participant.userId,
    } as {
      userId: string;
      amount?: number;
      percentage?: number;
    };

    if (draft.splitType === 'EXACT') {
      normalized.amount = Number(participant.amount);
    }

    if (draft.splitType === 'PERCENTAGE') {
      normalized.percentage = Number(participant.percentage);
    }

    return normalized;
  });

  const userIds = participants.map((participant) => participant.userId);
  const uniqueUserIds = new Set(userIds);
  if (uniqueUserIds.size !== userIds.length) {
    return { ok: false, message: 'Participant list cannot contain duplicates.' };
  }

  if (draft.splitType === 'EXACT') {
    const exactAmounts = participants.map((participant) => participant.amount ?? NaN);
    if (exactAmounts.some((value) => !Number.isInteger(value) || value < 0)) {
      return { ok: false, message: 'Exact split amounts must be non-negative integers.' };
    }

    const exactTotal = exactAmounts.reduce((sum, value) => sum + value, 0);
    if (exactTotal !== totalAmount) {
      return { ok: false, message: 'For EXACT split, amount sum must match total amount.' };
    }
  }

  if (draft.splitType === 'PERCENTAGE') {
    const percentages = participants.map((participant) => participant.percentage ?? NaN);
    if (percentages.some((value) => Number.isNaN(value) || value < 0 || value > 100)) {
      return { ok: false, message: 'Percentages must be between 0 and 100.' };
    }

    const percentageSum = percentages.reduce((sum, value) => sum + value, 0);
    if (Math.abs(percentageSum - 100) > 0.001) {
      return { ok: false, message: 'For PERCENTAGE split, percentage sum must equal 100.' };
    }
  }

  return {
    ok: true,
    payload: {
      paidByUserId: draft.paidByUserId,
      totalAmount,
      currency: draft.currency.toUpperCase(),
      description: draft.description.trim(),
      splitType: draft.splitType,
      participants,
    },
  };
}
