import { describe, expect, it } from 'vitest';
import { createExpenseSchema } from '../src/lib/validation.js';

describe('createExpenseSchema', () => {
  it('accepts a valid EQUAL split payload', () => {
    const payload = {
      paidByUserId: 'cmo403gee0004eabgg1v5seug',
      totalAmount: 3000,
      currency: 'USD',
      description: 'Dinner',
      splitType: 'EQUAL',
      participants: [
        { userId: 'cmo403gee0004eabgg1v5seug' },
      ],
    };

    const parsed = createExpenseSchema.parse(payload);
    expect(parsed.splitType).toBe('EQUAL');
  });

  it('rejects EXACT split payload without amounts', () => {
    const payload = {
      paidByUserId: 'cmo403gee0004eabgg1v5seug',
      totalAmount: 3000,
      currency: 'USD',
      description: 'Taxi',
      splitType: 'EXACT',
      participants: [
        { userId: 'cmo403gee0004eabgg1v5seug' },
      ],
    };

    const result = createExpenseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects PERCENTAGE split payload without percentages', () => {
    const payload = {
      paidByUserId: 'cmo403gee0004eabgg1v5seug',
      totalAmount: 3000,
      currency: 'USD',
      description: 'Hotel',
      splitType: 'PERCENTAGE',
      participants: [
        { userId: 'cmo403gee0004eabgg1v5seug' },
      ],
    };

    const result = createExpenseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
