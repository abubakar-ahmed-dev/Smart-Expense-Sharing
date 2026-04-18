import { AppError } from '../middleware/errorHandler.js';
import { userRepository } from '../repositories/userRepository.js';
import { CreateUserInput, UpdateUserInput } from '../lib/validation.js';
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
      isVerified: input.isVerified ?? false,
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
      ...(typeof input.isVerified === 'boolean' ? { isVerified: input.isVerified } : {}),
      ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
    });
  }

  async deleteUser(id: string) {
    await this.getUserById(id);
    return userRepository.delete(id);
  }
}

export const userService = new UserService();
