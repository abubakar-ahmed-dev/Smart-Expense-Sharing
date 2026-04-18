import { Router } from 'express';
import { z } from 'zod';
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
  updateGroupMemberRoleSchema,
  updateGroupSchema,
  updateUserSchema,
} from '../lib/validation.js';
import { healthController } from '../controllers/healthController.js';

export const v1Router = Router();

// Health check (no auth required)
v1Router.get('/health', healthController);

// ============================================
// USER ROUTES
// ============================================

// Public user endpoints
v1Router.get('/users', userController.listUsers);
v1Router.post('/users', validateRequest(createUserSchema), userController.createUser);

// Parameterized user endpoints
const userIdSchema = z.object({ userId: z.string().cuid() });
v1Router.get(
  '/users/:userId',
  validatePathParams(userIdSchema),
  userController.getUserById,
);
v1Router.put(
  '/users/:userId',
  validatePathParams(userIdSchema),
  validateRequest(updateUserSchema),
  userController.updateUser,
);
v1Router.delete(
  '/users/:userId',
  validatePathParams(userIdSchema),
  userController.deleteUser,
);

// ============================================
// GROUP ROUTES
// ============================================

// Group listing (public)
v1Router.get('/groups', groupController.listGroups);

// User's groups (requires auth)
v1Router.get(
  '/users/:userId/groups',
  validatePathParams(userIdSchema),
  groupController.getUserGroups,
);

// Create group (requires auth)
v1Router.post(
  '/groups',
  mockAuth,
  requireAuth,
  validateRequest(createGroupSchema),
  groupController.createGroup,
);

// Get group details
const groupIdSchema = z.object({ groupId: z.string().cuid() });
v1Router.get(
  '/groups/:groupId',
  validatePathParams(groupIdSchema),
  groupController.getGroupById,
);

// Update group
v1Router.put(
  '/groups/:groupId',
  validatePathParams(groupIdSchema),
  validateRequest(updateGroupSchema),
  groupController.updateGroup,
);

// Delete group
v1Router.delete(
  '/groups/:groupId',
  validatePathParams(groupIdSchema),
  groupController.deleteGroup,
);

// ============================================
// GROUP MEMBER ROUTES
// ============================================

// Get group members
v1Router.get(
  '/groups/:groupId/members',
  validatePathParams(groupIdSchema),
  groupController.getGroupMembers,
);

// Add group member (requires auth)
v1Router.post(
  '/groups/:groupId/members',
  mockAuth,
  requireAuth,
  validatePathParams(groupIdSchema),
  validateRequest(addGroupMemberSchema),
  groupController.addGroupMember,
);

// Remove group member (requires auth)
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

// Update group member role (requires auth)
v1Router.put(
  '/groups/:groupId/members/:memberId/role',
  mockAuth,
  requireAuth,
  validatePathParams(memberIdSchema),
  validateRequest(updateGroupMemberRoleSchema),
  groupController.updateGroupMemberRole,
);

// ============================================
// EXPENSE ROUTES (PHASE 4)
// ============================================

const expenseIdSchema = z.object({
  groupId: z.string().cuid(),
  expenseId: z.string().cuid(),
});

v1Router.get(
  '/groups/:groupId/expenses',
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
  validatePathParams(expenseIdSchema),
  expenseController.getGroupExpenseById,
);

// ============================================
// BALANCE ROUTES (PHASE 5)
// ============================================

const groupUserIdSchema = z.object({
  groupId: z.string().cuid(),
  userId: z.string().cuid(),
});

v1Router.get(
  '/groups/:groupId/balances',
  validatePathParams(groupIdSchema),
  balanceController.getGroupBalances,
);

v1Router.get(
  '/groups/:groupId/balances/users/:userId',
  validatePathParams(groupUserIdSchema),
  balanceController.getUserBalanceSummary,
);

// ============================================
// SETTLEMENT ROUTES (PHASE 5)
// ============================================

const settlementIdSchema = z.object({
  groupId: z.string().cuid(),
  settlementId: z.string().min(1),
});

v1Router.get(
  '/groups/:groupId/settlements',
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
  validatePathParams(settlementIdSchema),
  settlementController.getGroupSettlementById,
);
