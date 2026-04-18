import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/authController.js';
import * as balanceController from '../controllers/balanceController.js';
import * as expenseController from '../controllers/expenseController.js';
import * as groupController from '../controllers/groupController.js';
import * as settlementController from '../controllers/settlementController.js';
import * as userController from '../controllers/userController.js';
import { mockAuth, requireAuth } from '../middleware/auth.js';
import { validatePathParams, validateRequest } from '../middleware/validation.js';
import {
  addGroupMemberSchema,
  createExpenseSchema,
  createGroupSchema,
  createSettlementSchema,
  createUserSchema,
  loginSchema,
  updateGroupMemberRoleSchema,
  updateGroupSchema,
  updateUserSchema,
} from '../lib/validation.js';
import { healthController } from '../controllers/healthController.js';

export const v1Router = Router();
v1Router.get('/health', healthController);

v1Router.post('/auth/login', validateRequest(loginSchema), authController.login);
v1Router.post('/auth/signup', validateRequest(createUserSchema), authController.signup);

v1Router.get('/users', mockAuth, requireAuth, userController.listUsers);
v1Router.post('/users', mockAuth, requireAuth, validateRequest(createUserSchema), userController.createUser);

const userIdSchema = z.object({ userId: z.string().cuid() });
v1Router.get(
  '/users/:userId',
  mockAuth,
  requireAuth,
  validatePathParams(userIdSchema),
  userController.getUserById,
);
v1Router.put(
  '/users/:userId',
  mockAuth,
  requireAuth,
  validatePathParams(userIdSchema),
  validateRequest(updateUserSchema),
  userController.updateUser,
);
v1Router.delete(
  '/users/:userId',
  mockAuth,
  requireAuth,
  validatePathParams(userIdSchema),
  userController.deleteUser,
);


v1Router.get(
  '/users/:userId/phones',
  mockAuth,
  requireAuth,
  validatePathParams(userIdSchema),
  userController.listPhoneNumbers,
);


v1Router.post(
  '/users/:userId/phones',
  mockAuth,
  requireAuth,
  validatePathParams(userIdSchema),
  validateRequest(z.object({ number: z.string().min(1), label: z.string().optional() })),
  userController.addPhoneNumber,
);


const phoneIdSchema = z.object({ userId: z.string().cuid(), phoneId: z.string().cuid() });
v1Router.put(
  '/users/:userId/phones/:phoneId',
  mockAuth,
  requireAuth,
  validatePathParams(phoneIdSchema),
  validateRequest(z.object({ number: z.string().min(1).optional(), label: z.string().optional(), verified: z.boolean().optional() })),
  userController.updatePhoneNumber,
);


v1Router.delete(
  '/users/:userId/phones/:phoneId',
  mockAuth,
  requireAuth,
  validatePathParams(phoneIdSchema),
  userController.deletePhoneNumber,
);


v1Router.get('/groups', mockAuth, requireAuth, groupController.listGroups);

v1Router.get(
  '/users/:userId/groups',
  mockAuth,
  requireAuth,
  validatePathParams(userIdSchema),
  groupController.getUserGroups,
);


v1Router.post(
  '/groups',
  mockAuth,
  requireAuth,
  validateRequest(createGroupSchema),
  groupController.createGroup,
);


const groupIdSchema = z.object({ groupId: z.string().cuid() });
v1Router.get(
  '/groups/:groupId',
  mockAuth,
  requireAuth,
  validatePathParams(groupIdSchema),
  groupController.getGroupById,
);


v1Router.put(
  '/groups/:groupId',
  mockAuth,
  requireAuth,
  validatePathParams(groupIdSchema),
  validateRequest(updateGroupSchema),
  groupController.updateGroup,
);


v1Router.delete(
  '/groups/:groupId',
  mockAuth,
  requireAuth,
  validatePathParams(groupIdSchema),
  groupController.deleteGroup,
);


v1Router.get(
  '/groups/:groupId/members',
  mockAuth,
  requireAuth,
  validatePathParams(groupIdSchema),
  groupController.getGroupMembers,
);


v1Router.post(
  '/groups/:groupId/members',
  mockAuth,
  requireAuth,
  validatePathParams(groupIdSchema),
  validateRequest(addGroupMemberSchema),
  groupController.addGroupMember,
);


const memberIdSchema = z.object({
  groupId: z.string().cuid(),
  memberId: z.string().cuid(),
});
v1Router.delete(
  '/groups/:groupId/members/:memberId',
  mockAuth,
  requireAuth,
  validatePathParams(memberIdSchema),
  groupController.removeGroupMember,
);


v1Router.put(
  '/groups/:groupId/members/:memberId/role',
  mockAuth,
  requireAuth,
  validatePathParams(memberIdSchema),
  validateRequest(updateGroupMemberRoleSchema),
  groupController.updateGroupMemberRole,
);


const expenseIdSchema = z.object({
  groupId: z.string().cuid(),
  expenseId: z.string().cuid(),
});

v1Router.get(
  '/groups/:groupId/expenses',
  mockAuth,
  requireAuth,
  validatePathParams(groupIdSchema),
  expenseController.listGroupExpenses,
);

v1Router.post(
  '/groups/:groupId/expenses',
  mockAuth,
  requireAuth,
  validatePathParams(groupIdSchema),
  validateRequest(createExpenseSchema),
  expenseController.createGroupExpense,
);

v1Router.get(
  '/groups/:groupId/expenses/:expenseId',
  mockAuth,
  requireAuth,
  validatePathParams(expenseIdSchema),
  expenseController.getGroupExpenseById,
);


const groupUserIdSchema = z.object({
  groupId: z.string().cuid(),
  userId: z.string().cuid(),
});

v1Router.get(
  '/groups/:groupId/balances',
  mockAuth,
  requireAuth,
  validatePathParams(groupIdSchema),
  balanceController.getGroupBalances,
);

v1Router.get(
  '/groups/:groupId/balances/users/:userId',
  mockAuth,
  requireAuth,
  validatePathParams(groupUserIdSchema),
  balanceController.getUserBalanceSummary,
);


const settlementIdSchema = z.object({
  groupId: z.string().cuid(),
  settlementId: z.string().min(1),
});

v1Router.get(
  '/groups/:groupId/settlements',
  mockAuth,
  requireAuth,
  validatePathParams(groupIdSchema),
  settlementController.listGroupSettlements,
);

v1Router.post(
  '/groups/:groupId/settlements',
  mockAuth,
  requireAuth,
  validatePathParams(groupIdSchema),
  validateRequest(createSettlementSchema),
  settlementController.createGroupSettlement,
);

v1Router.get(
  '/groups/:groupId/settlements/:settlementId',
  mockAuth,
  requireAuth,
  validatePathParams(settlementIdSchema),
  settlementController.getGroupSettlementById,
);
