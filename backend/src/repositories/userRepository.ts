import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { CreateUserInput, UpdateUserInput } from '../lib/validation.js';

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const authUserSelect = {
  id: true,
  email: true,
  name: true,
  passwordHash: true,
  isVerified: true,
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

  async create(data: Omit<CreateUserInput, 'password'> & { passwordHash: string }): Promise<PublicUser> {
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        isVerified: data.isVerified ?? false,
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
}

export const userRepository = new UserRepository();
