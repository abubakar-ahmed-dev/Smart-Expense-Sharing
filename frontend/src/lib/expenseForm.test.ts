import { describe, expect, it } from 'vitest';
import { validateExpenseFormDraft } from './expenseForm';

describe('validateExpenseFormDraft', () => {
  it('accepts a valid equal split payload', () => {
    const result = validateExpenseFormDraft({
      paidByUserId: 'user-a',
      totalAmount: '1200',
      currency: 'USD',
      description: 'Dinner',
      splitType: 'EQUAL',
      participants: [
        { userId: 'user-a' },
        { userId: 'user-b' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.payload?.totalAmount).toBe(1200);
  });

  it('rejects invalid exact split sum', () => {
    const result = validateExpenseFormDraft({
      paidByUserId: 'user-a',
      totalAmount: '1000',
      currency: 'USD',
      description: 'Taxi',
      splitType: 'EXACT',
      participants: [
        { userId: 'user-a', amount: '200' },
        { userId: 'user-b', amount: '200' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('EXACT');
  });

  it('rejects invalid percentage total', () => {
    const result = validateExpenseFormDraft({
      paidByUserId: 'user-a',
      totalAmount: '1000',
      currency: 'USD',
      description: 'Hotel',
      splitType: 'PERCENTAGE',
      participants: [
        { userId: 'user-a', percentage: '40' },
        { userId: 'user-b', percentage: '40' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('PERCENTAGE');
  });
});
