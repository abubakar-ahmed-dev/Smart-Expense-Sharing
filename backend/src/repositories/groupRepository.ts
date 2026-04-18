import { Group, GroupMember } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { AddGroupMemberInput, CreateGroupInput, UpdateGroupInput, UpdateGroupMemberRoleInput } from '../lib/validation.js';

export class GroupRepository {
  async findById(id: string): Promise<Group | null> {
    return prisma.group.findUnique({
      where: { id },
    });
  }

  async findByIdWithMembers(id: string) {
    return prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findAll(): Promise<Group[]> {
    return prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUserGroups(userId: string) {
    return prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      include: {
        members: {
          where: { isActive: true },
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreateGroupInput, createdByUserId: string): Promise<Group> {
    return prisma.group.create({
      data: {
        name: data.name,
        createdBy: createdByUserId,
        members: {
          create: {
            userId: createdByUserId,
            role: 'ADMIN',
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateGroupInput): Promise<Group> {
    return prisma.group.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Group> {
    return prisma.group.delete({
      where: { id },
    });
  }

  async findMember(groupId: string, userId: string): Promise<GroupMember | null> {
    return prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });
  }

  async addMember(groupId: string, data: AddGroupMemberInput): Promise<GroupMember> {
    return prisma.groupMember.create({
      data: {
        groupId,
        userId: data.userId,
        role: data.role,
      },
    });
  }

  async removeMember(groupId: string, userId: string): Promise<GroupMember> {
    return prisma.groupMember.delete({
      where: {
        groupId_userId: { groupId, userId },
      },
    });
  }

  async updateMemberRole(
    groupId: string,
    userId: string,
    data: UpdateGroupMemberRoleInput,
  ): Promise<GroupMember> {
    return prisma.groupMember.update({
      where: {
        groupId_userId: { groupId, userId },
      },
      data: { role: data.role },
    });
  }

  async getMembers(groupId: string) {
    return prisma.groupMember.findMany({
      where: { groupId, isActive: true },
      include: { user: true },
      orderBy: { joinedAt: 'desc' },
    });
  }
}

export const groupRepository = new GroupRepository();
