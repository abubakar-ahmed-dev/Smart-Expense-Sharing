import { AppError } from '../middleware/errorHandler.js';
import { LoginInput, CreateUserInput } from '../lib/validation.js';
import { hashPassword, signAuthToken, verifyPassword, type AuthSessionData } from '../lib/security.js';
import { userRepository } from '../repositories/userRepository.js';

export class AuthService {
  async signup(input: CreateUserInput): Promise<AuthSessionData> {
    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new AppError('EMAIL_ALREADY_EXISTS', 'User with this email already exists', 409);
    }

    const user = await userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash: hashPassword(input.password),
      isVerified: input.isVerified ?? false,
    });

    return this.createSession(user.id, user.email, user.name, user.isVerified);
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

    return this.createSession(authUser.id, authUser.email, authUser.name, authUser.isVerified);
  }

  private createSession(userId: string, email: string, name: string, isVerified: boolean): AuthSessionData {
    return {
      token: signAuthToken({
        sub: userId,
        email,
        name,
        isVerified,
      }),
      user: {
        id: userId,
        email,
        name,
        isVerified,
      },
    };
  }
}

export const authService = new AuthService();
