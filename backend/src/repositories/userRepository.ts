import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { CreateUserInput, UpdateUserInput } from '../lib/validation.js';

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  phones: {
    select: {
      id: true,
      number: true,
      label: true,
      verified: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const authUserSelect = {
  id: true,
  email: true,
  name: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
export type AuthUserRecord = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;

export class UserRepository {
  async findById(id: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  }

  async findByEmail(email: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({ where: { email }, select: publicUserSelect });
  }

  async findAuthByEmail(email: string): Promise<AuthUserRecord | null> {
    return prisma.user.findUnique({ where: { email }, select: authUserSelect });
  }

  async findAll(): Promise<PublicUser[]> {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: publicUserSelect,
    });
  }

  async findPhoneById(phoneId: string) {
    return prisma.userPhone.findUnique({
      where: { id: phoneId },
      select: {
        id: true,
        userId: true,
        number: true,
        label: true,
        verified: true,
        createdAt: true,
      },
    });
  }

  async create(data: Omit<CreateUserInput, 'password' | 'phone'> & { passwordHash: string }): Promise<PublicUser> {
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
      },
      select: publicUserSelect,
    });
  }

  async update(id: string, data: Omit<UpdateUserInput, 'password'> & { passwordHash?: string }): Promise<PublicUser> {
    return prisma.user.update({
      where: { id },
      data,
      select: publicUserSelect,
    });
  }

  async delete(id: string): Promise<PublicUser> {
    return prisma.user.delete({
      where: { id },
      select: publicUserSelect,
    });
  }

  // Phone management
  async createPhone(userId: string, data: { number: string; label?: string }) {
    return prisma.userPhone.create({
      data: {
        userId,
        number: data.number,
        label: data.label || null,
      },
      select: {
        id: true,
        userId: true,
        number: true,
        label: true,
        verified: true,
        createdAt: true,
      },
    });
  }

  async updatePhone(phoneId: string, data: { number?: string; label?: string; verified?: boolean }) {
    return prisma.userPhone.update({
      where: { id: phoneId },
      data,
      select: {
        id: true,
        userId: true,
        number: true,
        label: true,
        verified: true,
        createdAt: true,
      },
    });
  }

  async deletePhone(phoneId: string) {
    return prisma.userPhone.delete({
      where: { id: phoneId },
      select: {
        id: true,
        userId: true,
        number: true,
        label: true,
        verified: true,
        createdAt: true,
      },
    });
  }

  async listPhonesByUserId(userId: string) {
    return prisma.userPhone.findMany({
      where: { userId },
      select: {
        id: true,
        number: true,
        label: true,
        verified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findPhoneByNumber(phoneNumber: string) {
    return prisma.userPhone.findFirst({
      where: { number: phoneNumber },
      select: {
        id: true,
        userId: true,
        number: true,
        label: true,
        verified: true,
        createdAt: true,
      },
    });
  }
}

export const userRepository = new UserRepository();
