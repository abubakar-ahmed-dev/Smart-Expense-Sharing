import { AppError } from '../middleware/errorHandler.js';
import { groupRepository } from '../repositories/groupRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import {
  CreateGroupInput,
  UpdateGroupInput,
  AddGroupMemberInput,
  UpdateGroupMemberRoleInput,
} from '../lib/validation.js';

export class GroupService {
  private async requireGroupMembership(groupId: string, userId: string) {
    const membership = await groupRepository.findMember(groupId, userId);
    if (!membership || !membership.isActive) {
      throw new AppError('FORBIDDEN', 'You are not a member of this group', 403);
    }
    return membership;
  }

  async getGroupById(id: string) {
    const group = await groupRepository.findById(id);
    if (!group) {
      throw new AppError('GROUP_NOT_FOUND', 'Group not found', 404);
    }
    return group;
  }

  async getGroupByIdWithMembers(id: string) {
    const group = await groupRepository.findByIdWithMembers(id);
    if (!group) {
      throw new AppError('GROUP_NOT_FOUND', 'Group not found', 404);
    }
    return group;
  }

  async getGroupByIdWithMembersForUser(groupId: string, userId: string) {
    await this.getGroupById(groupId);
    await this.requireGroupMembership(groupId, userId);
    return this.getGroupByIdWithMembers(groupId);
  }

  async getAllGroups() {
    return groupRepository.findAll();
  }

  async getUserGroups(userId: string) {
    // Verify user exists
    await userRepository.findById(userId);
    return groupRepository.findUserGroups(userId);
  }

  async createGroup(input: CreateGroupInput, createdByUserId: string) {
    // Verify user exists
    await userRepository.findById(createdByUserId);
    return groupRepository.create(input, createdByUserId);
  }

  async updateGroup(id: string, input: UpdateGroupInput) {
    await this.getGroupById(id);
    return groupRepository.update(id, input);
  }

  async deleteGroup(id: string) {
    await this.getGroupById(id);
    return groupRepository.delete(id);
  }

  async addMember(
    groupId: string,
    input: AddGroupMemberInput,
    requestingUserId: string,
  ) {
    // Verify group exists
    const group = await this.getGroupById(groupId);

    // Check requesting user is admin
    const requesterMember = await groupRepository.findMember(groupId, requestingUserId);
    if (!requesterMember || requesterMember.role !== 'ADMIN') {
      throw new AppError(
        'FORBIDDEN',
        'Only group admins can add members',
        403,
      );
    }

    // Verify user exists and is not already a member
    await userRepository.findById(input.userId);

    const selectedPhone = await userRepository.findPhoneById(input.phoneId);
    if (!selectedPhone || selectedPhone.userId !== input.userId) {
      throw new AppError(
        'INVALID_MEMBER_PHONE',
        'Selected contact number does not belong to this user',
        400,
      );
    }

    const existingMember = await groupRepository.findMember(groupId, input.userId);
    if (existingMember) {
      throw new AppError(
        'MEMBER_ALREADY_EXISTS',
        'User is already a member of this group',
        409,
      );
    }

    return groupRepository.addMember(groupId, input);
  }

  async removeMember(groupId: string, userId: string, requestingUserId: string) {
    // Verify group exists
    await this.getGroupById(groupId);

    // Check requesting user is admin
    const requesterMember = await groupRepository.findMember(groupId, requestingUserId);
    if (!requesterMember || requesterMember.role !== 'ADMIN') {
      throw new AppError(
        'FORBIDDEN',
        'Only group admins can remove members',
        403,
      );
    }

    // Prevent removing the group creator/last admin
    const targetMember = await groupRepository.findMember(groupId, userId);
    if (!targetMember) {
      throw new AppError('MEMBER_NOT_FOUND', 'Member not found in group', 404);
    }

    if (targetMember.role === 'ADMIN' && requestingUserId !== userId) {
      // Check if this is the only admin
      const members = await groupRepository.getMembers(groupId);
      const adminCount = members.filter((m) => m.role === 'ADMIN').length;
      if (adminCount === 1) {
        throw new AppError(
          'CANNOT_REMOVE_LAST_ADMIN',
          'Cannot remove the last admin from the group',
          400,
        );
      }
    }

    return groupRepository.removeMember(groupId, userId);
  }

  async updateMemberRole(
    groupId: string,
    userId: string,
    input: UpdateGroupMemberRoleInput,
    requestingUserId: string,
  ) {
    // Verify group exists
    await this.getGroupById(groupId);

    // Check requesting user is admin
    const requesterMember = await groupRepository.findMember(groupId, requestingUserId);
    if (!requesterMember || requesterMember.role !== 'ADMIN') {
      throw new AppError(
        'FORBIDDEN',
        'Only group admins can change member roles',
        403,
      );
    }

    // Verify target member exists
    const targetMember = await groupRepository.findMember(groupId, userId);
    if (!targetMember) {
      throw new AppError('MEMBER_NOT_FOUND', 'Member not found in group', 404);
    }

    // Prevent demoting last admin
    if (input.role === 'MEMBER' && targetMember.role === 'ADMIN') {
      const members = await groupRepository.getMembers(groupId);
      const adminCount = members.filter((m) => m.role === 'ADMIN').length;
      if (adminCount === 1) {
        throw new AppError(
          'CANNOT_DEMOTE_LAST_ADMIN',
          'Cannot demote the last admin from the group',
          400,
        );
      }
    }

    return groupRepository.updateMemberRole(groupId, userId, input);
  }

  async getGroupMembers(groupId: string) {
    await this.getGroupById(groupId);
    return groupRepository.getMembers(groupId);
  }

  async getGroupMembersForUser(groupId: string, userId: string) {
    await this.getGroupById(groupId);
    await this.requireGroupMembership(groupId, userId);
    return groupRepository.getMembers(groupId);
  }
}

export const groupService = new GroupService();
