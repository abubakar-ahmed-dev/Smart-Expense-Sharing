import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { userRepository } from '../repositories/userRepository.js';
import { CreateUserInput, UpdateUserInput, UserPhoneInput } from '../lib/validation.js';
import { balanceService } from './balanceService.js';
import { hashPassword } from '../lib/security.js';

export class UserService {
  async getUserById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }
    return user;
  }

  async getUserByEmail(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }
    return user;
  }

  async getAllUsers() {
    return userRepository.findAll();
  }

  async createUser(input: CreateUserInput) {
    // Check if email already exists
    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new AppError(
        'EMAIL_ALREADY_EXISTS',
        'User with this email already exists',
        409,
      );
    }

    return userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash: hashPassword(input.password),
    });
  }

  async updateUser(id: string, input: UpdateUserInput) {
    const user = await this.getUserById(id);

    // If email is being updated, check for duplicates
    if (input.email && input.email !== user.email) {
      const existingUser = await userRepository.findByEmail(input.email);
      if (existingUser) {
        throw new AppError(
          'EMAIL_ALREADY_EXISTS',
          'User with this email already exists',
          409,
        );
      }
    }

    return userRepository.update(id, {
      ...(input.email ? { email: input.email } : {}),
      ...(input.name ? { name: input.name } : {}),
      ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
    });
  }

  async getAccountDeletionStatus(id: string) {
    await this.getUserById(id);

    const outstandingDebt = await balanceService.getUserOutstandingDebt(id);

    return {
      outstandingDebt,
      canDelete: outstandingDebt === 0,
    };
  }

  async deleteUser(id: string) {
    await this.getUserById(id);

    const outstandingDebt = await balanceService.getUserOutstandingDebt(id);
    if (outstandingDebt > 0) {
      throw new AppError(
        'ACCOUNT_HAS_PENDING_BALANCE',
        'Settle all outstanding balances before deleting your account',
        409,
        { outstandingDebt },
      );
    }

    try {
      return await userRepository.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new AppError(
          'ACCOUNT_DELETE_BLOCKED',
          'Delete or reassign groups, expenses, or settlements that still reference your account',
          409,
        );
      }

      throw error;
    }
  }

  // Phone management
  async addPhoneNumber(userId: string, input: UserPhoneInput) {
    // Verify user exists
    await this.getUserById(userId);

    // Check if phone number already exists for this user
    const existingPhones = await userRepository.listPhonesByUserId(userId);
    if (existingPhones.some((p) => p.number === input.number)) {
      throw new AppError(
        'PHONE_ALREADY_EXISTS',
        'This phone number is already added for this user',
        409,
      );
    }

    return userRepository.createPhone(userId, {
      number: input.number,
      label: input.label,
    });
  }

  async updatePhoneNumber(userId: string, phoneId: string, input: Partial<UserPhoneInput>) {
    // Verify user exists
    await this.getUserById(userId);

    // Verify phone belongs to user
    const phone = await userRepository.findPhoneById(phoneId);
    if (!phone || phone.userId !== userId) {
      throw new AppError('PHONE_NOT_FOUND', 'Phone number not found for this user', 404);
    }

    // Check if new number already exists (if number is being updated)
    if (input.number && input.number !== phone.number) {
      const existingPhones = await userRepository.listPhonesByUserId(userId);
      if (existingPhones.some((p) => p.number === input.number)) {
        throw new AppError(
          'PHONE_ALREADY_EXISTS',
          'This phone number is already added for this user',
          409,
        );
      }
    }

    const updateData: { number?: string; label?: string; verified?: boolean } = {};
    if (input.number) {
      updateData.number = input.number;
    }
    if (input.label !== undefined) {
      updateData.label = input.label || undefined;
    }
    if (input.verified !== undefined) {
      updateData.verified = input.verified;
    }

    return userRepository.updatePhone(phoneId, updateData);
  }

  async deletePhoneNumber(userId: string, phoneId: string) {
    // Verify user exists
    await this.getUserById(userId);

    // Verify phone belongs to user
    const phone = await userRepository.findPhoneById(phoneId);
    if (!phone || phone.userId !== userId) {
      throw new AppError('PHONE_NOT_FOUND', 'Phone number not found for this user', 404);
    }

    return userRepository.deletePhone(phoneId);
  }

  async listPhoneNumbers(userId: string) {
    // Verify user exists
    await this.getUserById(userId);
    return userRepository.listPhonesByUserId(userId);
  }
}

export const userService = new UserService();
