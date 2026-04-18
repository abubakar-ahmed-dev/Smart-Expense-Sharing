import { AppError } from '../middleware/errorHandler.js';
import { LoginInput, CreateUserInput } from '../lib/validation.js';
import { hashPassword, signAuthToken, verifyPassword, type AuthSessionData } from '../lib/security.js';
import { userRepository } from '../repositories/userRepository.js';

export class AuthService {
  async signup(input: CreateUserInput): Promise<AuthSessionData> {
    // Ensure phone is provided for signup
    if (!input.phone) {
      throw new AppError('PHONE_REQUIRED', 'Phone number is required for signup', 400);
    }

    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new AppError('EMAIL_ALREADY_EXISTS', 'User with this email already exists', 409);
    }

    // Check if phone number already exists
    const existingPhone = await userRepository.findPhoneByNumber(input.phone);
    if (existingPhone) {
      throw new AppError('PHONE_ALREADY_EXISTS', 'Phone number already exists', 409);
    }

    const user = await userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash: hashPassword(input.password),
    });

    // Create phone number record for the user
    await userRepository.createPhone(user.id, { number: input.phone });

    return this.createSession(user.id, user.email, user.name);
  }

  async login(input: LoginInput): Promise<AuthSessionData> {
    const authUser = await userRepository.findAuthByEmail(input.email);
    if (!authUser) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const validPassword = verifyPassword(input.password, authUser.passwordHash);
    if (!validPassword) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    return this.createSession(authUser.id, authUser.email, authUser.name);
  }

  private createSession(userId: string, email: string, name: string): AuthSessionData {
    return {
      token: signAuthToken({
        sub: userId,
        email,
        name,
      }),
      user: {
        id: userId,
        email,
        name,
      },
    };
  }
}

export const authService = new AuthService();
