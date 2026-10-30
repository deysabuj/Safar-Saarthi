import { prisma } from '../config/database.js';
import { Security } from '../utils/security.js';
import { AppError } from '../errors/AppError.js';
import { UserProfile, AuthSession, UserTravelPreferences } from '@safar-saarthi/shared';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  preferences?: UserTravelPreferences;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Registers a new user account with hashed password and travel preferences.
   */
  static async register(input: RegisterInput): Promise<AuthSession> {
    const cleanEmail = input.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      throw new AppError('An account with this email address already exists', 409, 'DUPLICATE_EMAIL');
    }

    const passwordHash = await Security.hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        name: input.name.trim(),
        passwordHash,
        preferences: (input.preferences as any) || {
          defaultPace: 'MODERATE',
          dietary: 'VEG',
          defaultTravelStyle: 'MID_RANGE',
          preferredTransportModes: ['TRAIN', 'FLIGHT', 'BUS'],
        },
      },
    });

    const token = Security.generateJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      preferences: user.preferences as any,
      createdAt: user.createdAt.toISOString(),
    };

    return {
      user: userProfile,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Authenticates user with email and password.
   */
  static async login(input: LoginInput): Promise<AuthSession> {
    const cleanEmail = input.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user || !user.passwordHash) {
      // Use uniform error message to prevent account enumeration
      throw AppError.unauthorized('Invalid email or password');
    }

    const isValid = await Security.verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const token = Security.generateJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      preferences: user.preferences as any,
      createdAt: user.createdAt.toISOString(),
    };

    return {
      user: userProfile,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Fetches the current authenticated user session and profile.
   */
  static async getCurrentSession(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.unauthorized('User session no longer exists');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      preferences: user.preferences as any,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
