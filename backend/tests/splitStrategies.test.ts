import { describe, expect, it } from 'vitest';
import {
  EqualSplitStrategy,
  ExactSplitStrategy,
  PercentageSplitStrategy,
} from '../src/services/splitStrategies.js';

describe('Split strategies', () => {
  it('EqualSplitStrategy should split exactly with remainder distribution', () => {
    const strategy = new EqualSplitStrategy();

    const shares = strategy.computeShares({
      totalAmount: 100,
      participants: [
        { userId: 'u1' },
        { userId: 'u2' },
        { userId: 'u3' },
      ],
    });

    expect(shares).toEqual([
      { userId: 'u1', amountOwed: 34 },
      { userId: 'u2', amountOwed: 33 },
      { userId: 'u3', amountOwed: 33 },
    ]);
    expect(shares.reduce((sum, item) => sum + item.amountOwed, 0)).toBe(100);
  });

  it('ExactSplitStrategy should enforce sum equals total', () => {
    const strategy = new ExactSplitStrategy();

    const shares = strategy.computeShares({
      totalAmount: 100,
      participants: [
        { userId: 'u1', amount: 40 },
        { userId: 'u2', amount: 30 },
        { userId: 'u3', amount: 30 },
      ],
    });

    expect(shares).toEqual([
      { userId: 'u1', amountOwed: 40 },
      { userId: 'u2', amountOwed: 30 },
      { userId: 'u3', amountOwed: 30 },
    ]);
  });

  it('PercentageSplitStrategy should handle integer rounding and preserve total', () => {
    const strategy = new PercentageSplitStrategy();

    const shares = strategy.computeShares({
      totalAmount: 100,
      participants: [
        { userId: 'u1', percentage: 33.33 },
        { userId: 'u2', percentage: 33.33 },
        { userId: 'u3', percentage: 33.34 },
      ],
    });

    expect(shares.reduce((sum, item) => sum + item.amountOwed, 0)).toBe(100);
    expect(shares).toHaveLength(3);
  });

  it('PercentageSplitStrategy should reject invalid percentage totals', () => {
    const strategy = new PercentageSplitStrategy();

    expect(() =>
      strategy.computeShares({
        totalAmount: 100,
        participants: [
          { userId: 'u1', percentage: 60 },
          { userId: 'u2', percentage: 30 },
        ],
      }),
    ).toThrow('Sum of percentages must equal 100');
  });
});
