import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  phone: z.string().min(1, 'Phone number is required').max(20, 'Phone number is too long').optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  name: z.string().min(1, 'Name is required').max(255).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters long').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const userPhoneSchema = z.object({
  number: z.string().min(1, 'Phone number is required'),
  label: z.string().optional(),
  verified: z.boolean().optional(),
});

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(255),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(255).optional(),
});

export const addGroupMemberSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  phoneId: z.string().cuid('Invalid phone ID'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

export const updateGroupMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

export const splitTypeSchema = z.enum(['EQUAL', 'EXACT', 'PERCENTAGE']);

export const expenseParticipantSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  amount: z.number().int().nonnegative().optional(),
  percentage: z.number().min(0).max(100).optional(),
});

export const createExpenseSchema = z
  .object({
    paidByUserId: z.string().cuid('Invalid payer user ID'),
    totalAmount: z.number().int().positive('Total amount must be a positive integer'),
    currency: z.string().length(3).default('USD'),
    description: z.string().min(1, 'Description is required').max(500),
    splitType: splitTypeSchema,
    participants: z.array(expenseParticipantSchema).min(1, 'At least one participant is required'),
  })
  .superRefine((value, ctx) => {
    if (value.splitType === 'EXACT') {
      value.participants.forEach((participant, index) => {
        if (participant.amount === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'amount is required for EXACT split',
            path: ['participants', index, 'amount'],
          });
        }
      });
    }

    if (value.splitType === 'PERCENTAGE') {
      value.participants.forEach((participant, index) => {
        if (participant.percentage === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'percentage is required for PERCENTAGE split',
            path: ['participants', index, 'percentage'],
          });
        }
      });
    }
  });

export const createSettlementSchema = z.object({
  fromUserId: z.string().cuid('Invalid debtor user ID'),
  toUserId: z.string().cuid('Invalid creditor user ID'),
  amount: z.number().int().positive('Settlement amount must be a positive integer'),
  idempotencyKey: z
    .string()
    .min(1, 'Idempotency key cannot be empty')
    .max(128, 'Idempotency key is too long')
    .optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UserPhoneInput = z.infer<typeof userPhoneSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;
export type UpdateGroupMemberRoleInput = z.infer<typeof updateGroupMemberRoleSchema>;
export type SplitTypeInput = z.infer<typeof splitTypeSchema>;
export type ExpenseParticipantInput = z.infer<typeof expenseParticipantSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
