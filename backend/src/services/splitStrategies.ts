import { AppError } from '../middleware/errorHandler.js';

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE';

export interface SplitParticipantInput {
  userId: string;
  amount?: number;
  percentage?: number;
}

export interface ShareAllocation {
  userId: string;
  amountOwed: number;
}

export interface SplitContext {
  totalAmount: number;
  participants: SplitParticipantInput[];
}

export interface SplitStrategy {
  computeShares(context: SplitContext): ShareAllocation[];
}

export class EqualSplitStrategy implements SplitStrategy {
  computeShares(context: SplitContext): ShareAllocation[] {
    const { totalAmount, participants } = context;

    if (participants.length === 0) {
      throw new AppError('INVALID_PARTICIPANTS', 'At least one participant is required', 400);
    }

    const baseShare = Math.floor(totalAmount / participants.length);
    let remainder = totalAmount % participants.length;

    return participants.map((participant) => {
      const amountOwed = baseShare + (remainder > 0 ? 1 : 0);
      if (remainder > 0) {
        remainder -= 1;
      }

      return {
        userId: participant.userId,
        amountOwed,
      };
    });
  }
}

export class ExactSplitStrategy implements SplitStrategy {
  computeShares(context: SplitContext): ShareAllocation[] {
    const { totalAmount, participants } = context;

    const shares = participants.map((participant) => {
      if (participant.amount === undefined) {
        throw new AppError(
          'INVALID_SPLIT_INPUT',
          'Amount is required for all participants when splitType is EXACT',
          400,
        );
      }

      if (!Number.isInteger(participant.amount) || participant.amount < 0) {
        throw new AppError('INVALID_SPLIT_INPUT', 'Exact split amounts must be non-negative integers', 400);
      }

      return {
        userId: participant.userId,
        amountOwed: participant.amount,
      };
    });

    const sum = shares.reduce((acc, share) => acc + share.amountOwed, 0);
    if (sum !== totalAmount) {
      throw new AppError(
        'INVALID_SPLIT_TOTAL',
        'Sum of exact split amounts must equal totalAmount',
        400,
        { expected: totalAmount, actual: sum },
      );
    }

    return shares;
  }
}

export class PercentageSplitStrategy implements SplitStrategy {
  computeShares(context: SplitContext): ShareAllocation[] {
    const { totalAmount, participants } = context;

    const normalized = participants.map((participant, index) => {
      if (participant.percentage === undefined) {
        throw new AppError(
          'INVALID_SPLIT_INPUT',
          'Percentage is required for all participants when splitType is PERCENTAGE',
          400,
        );
      }

      if (participant.percentage < 0 || participant.percentage > 100) {
        throw new AppError('INVALID_SPLIT_INPUT', 'Percentage values must be between 0 and 100', 400);
      }

      const exact = (totalAmount * participant.percentage) / 100;
      const floorValue = Math.floor(exact);

      return {
        index,
        userId: participant.userId,
        floorValue,
        fractional: exact - floorValue,
      };
    });

    const percentSum = participants.reduce((acc, participant) => acc + (participant.percentage ?? 0), 0);
    if (Math.abs(percentSum - 100) > 1e-9) {
      throw new AppError(
        'INVALID_SPLIT_TOTAL',
        'Sum of percentages must equal 100',
        400,
        { expected: 100, actual: percentSum },
      );
    }

    let assigned = normalized.reduce((acc, item) => acc + item.floorValue, 0);
    let remainder = totalAmount - assigned;

    const byFraction = [...normalized].sort((a, b) => {
      if (b.fractional === a.fractional) {
        return a.index - b.index;
      }
      return b.fractional - a.fractional;
    });

    for (let i = 0; i < byFraction.length && remainder > 0; i += 1) {
      byFraction[i].floorValue += 1;
      remainder -= 1;
    }

    assigned = byFraction.reduce((acc, item) => acc + item.floorValue, 0);
    if (assigned !== totalAmount) {
      throw new AppError(
        'INVALID_SPLIT_TOTAL',
        'Computed percentage split does not match totalAmount',
        400,
        { expected: totalAmount, actual: assigned },
      );
    }

    return byFraction
      .sort((a, b) => a.index - b.index)
      .map((item) => ({
        userId: item.userId,
        amountOwed: item.floorValue,
      }));
  }
}

export function getSplitStrategy(splitType: SplitType): SplitStrategy {
  switch (splitType) {
    case 'EQUAL':
      return new EqualSplitStrategy();
    case 'EXACT':
      return new ExactSplitStrategy();
    case 'PERCENTAGE':
      return new PercentageSplitStrategy();
    default:
      throw new AppError('INVALID_SPLIT_TYPE', 'Unsupported split type', 400, { splitType });
  }
}
