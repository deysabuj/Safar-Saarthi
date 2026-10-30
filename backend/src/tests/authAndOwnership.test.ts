import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { Security } from '../utils/security.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { authenticate, optionalAuthenticate, requireOwnership } from '../middleware/auth.js';
import { AuthService } from '../services/auth.service.js';
import { UserService } from '../services/user.service.js';
import { AuthController } from '../controllers/auth.controller.js';
import { UserController } from '../controllers/user.controller.js';
import { AppError } from '../errors/AppError.js';
import { prisma } from '../config/database.js';

describe('Phase 09 — User Accounts, Security & Anti-IDOR Ownership Test Suite', () => {
  // --------------------------------------------------------------------------
  // 1. Cryptographic and Security Utilities
  // --------------------------------------------------------------------------
  describe('Security Utilities (Scrypt, Constant-Time Verification & JWT)', () => {
    it('should hash a password and generate salt:hash format', async () => {
      const password = 'SecurePassword123!';
      const hash = await Security.hashPassword(password);

      expect(typeof hash).toBe('string');
      expect(hash).toContain(':');
      const [salt, key] = hash.split(':');
      expect(salt.length).toBe(32); // 16 bytes hex
      expect(key.length).toBe(128); // 64 bytes hex
    });

    it('should produce different hashes for the same password due to random salting', async () => {
      const password = 'SamePassword456!';
      const hash1 = await Security.hashPassword(password);
      const hash2 = await Security.hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(await Security.verifyPassword(password, hash1)).toBe(true);
      expect(await Security.verifyPassword(password, hash2)).toBe(true);
    });

    it('should verify correct password using constant-time comparison', async () => {
      const password = 'CorrectPassword789$';
      const hash = await Security.hashPassword(password);

      const isValid = await Security.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'CorrectPassword789$';
      const hash = await Security.hashPassword(password);

      const isValid = await Security.verifyPassword('WrongPassword!', hash);
      expect(isValid).toBe(false);
    });

    it('should handle malformed hash strings gracefully without throwing', async () => {
      expect(await Security.verifyPassword('test', 'invalid-no-colon')).toBe(false);
      expect(await Security.verifyPassword('test', '')).toBe(false);
      expect(await Security.verifyPassword('test', 'short:odd')).toBe(false);
    });

    it('should generate and verify valid JWT tokens', () => {
      const payload = {
        userId: 'usr-12345',
        email: 'traveler@safarsaarthi.in',
        role: 'USER' as const,
      };

      const token = Security.generateJwt(payload, 7200);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = Security.verifyJwt(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should reject expired JWT tokens', () => {
      const payload = {
        userId: 'usr-expired',
        email: 'expired@safarsaarthi.in',
        role: 'USER' as const,
      };

      // Generate token expired in the past (-10 seconds)
      const token = Security.generateJwt(payload, -10);
      expect(() => Security.verifyJwt(token)).toThrow(/expired/i);
    });

    it('should reject tampered JWT tokens or altered signatures', () => {
      const payload = {
        userId: 'usr-tamper',
        email: 'tamper@safarsaarthi.in',
        role: 'USER' as const,
      };

      const token = Security.generateJwt(payload, 3600);
      const parts = token.split('.');
      // Tamper payload to escalate role
      const tamperedPayload = Buffer.from(JSON.stringify({ ...payload, role: 'ADMIN' })).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      expect(() => Security.verifyJwt(tamperedToken)).toThrow();
    });

    it('should mask sensitive credential fields in logs and payloads', () => {
      const input = {
        user: 'traveler',
        password: 'SuperSecretPassword',
        token: 'eyJh...secretToken',
        clientSecret: 'amadeus_secret_9988',
        preferences: { pace: 'MODERATE' },
      };

      const masked = Security.maskSensitive(input);
      expect(masked.user).toBe('traveler');
      expect(masked.password).toBe('***MASKED***');
      expect(masked.token).toBe('***MASKED***');
      expect(masked.clientSecret).toBe('***MASKED***');
      expect(masked.preferences.pace).toBe('MODERATE');
    });

    it('should mask long credential strings with leading and trailing characters', () => {
      const longToken = 'secret-api-key-1234567890';
      const masked = Security.maskSensitive(longToken);
      expect(masked).toBe('sec...890');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Authentication and Authorization Middleware
  // --------------------------------------------------------------------------
  describe('Auth Middleware & Ownership Guard', () => {
    it('authenticate should reject requests without Authorization header or token with 401', () => {
      const req = { headers: {}, cookies: {} } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const err = next.mock.calls[0][0] as AppError;
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    });

    it('authenticate should accept valid Bearer token and attach user to req', () => {
      const token = Security.generateJwt(
        { userId: 'usr-valid', email: 'valid@safarsaarthi.in', role: 'USER' },
        3600
      );
      const req = {
        headers: { authorization: `Bearer ${token}` },
        cookies: {},
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe('usr-valid');
      expect(req.user?.email).toBe('valid@safarsaarthi.in');
    });

    it('optionalAuthenticate should allow unauthenticated guest requests to pass without error', () => {
      const req = { headers: {}, cookies: {} } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });

    it('requireOwnership should allow matching user to access resource', async () => {
      const req = {
        user: { userId: 'usr-owner-1', email: 'owner@test.in', role: 'USER' },
      } as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireOwnership(async () => 'usr-owner-1');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('requireOwnership should allow ADMIN user to access resource even if not owner', async () => {
      const req = {
        user: { userId: 'usr-admin-99', email: 'admin@safarsaarthi.in', role: 'ADMIN' },
      } as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireOwnership(async () => 'usr-different-owner');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('requireOwnership should block non-owner with 403 FORBIDDEN (anti-IDOR)', async () => {
      const req = {
        user: { userId: 'usr-attacker-2', email: 'attacker@test.in', role: 'USER' },
      } as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireOwnership(async () => 'usr-victim-1');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const err = next.mock.calls[0][0] as AppError;
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Rate Limiter Middleware
  // --------------------------------------------------------------------------
  describe('In-Memory Sliding Window Rate Limiter', () => {
    it('should allow requests within threshold and block requests exceeding limit with 429', () => {
      const testIp = '192.168.1.100';
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 5 });

      let blocked = false;
      let blockedError: AppError | undefined;

      for (let i = 0; i < 6; i++) {
        const req = { ip: testIp, headers: {}, baseUrl: '/api/v1/auth', path: '/login' } as unknown as Request;
        const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
        const next = vi.fn((err) => {
          if (err) {
            blocked = true;
            blockedError = err;
          }
        });

        limiter(req, res, next);
      }

      expect(blocked).toBe(true);
      expect(blockedError?.statusCode).toBe(429);
      expect(blockedError?.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  // --------------------------------------------------------------------------
  // 4. AuthService Unit / Logic Tests
  // --------------------------------------------------------------------------
  describe('AuthService (Registration, Login & Session Management)', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('register should hash password, store preferences, and return session without password hash', async () => {
      const mockCreatedUser = {
        id: 'usr-new-1',
        email: 'rahul@example.in',
        name: 'Rahul Sharma',
        role: 'USER' as const,
        preferences: { defaultPace: 'MODERATE', preferredTransportModes: ['TRAIN'] },
        createdAt: new Date('2026-10-28'),
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.user, 'create').mockResolvedValue(mockCreatedUser as any);

      const session = await AuthService.register({
        email: 'rahul@example.in',
        password: 'ValidPassword123!',
        name: 'Rahul Sharma',
        preferences: { defaultPace: 'MODERATE', preferredTransportModes: ['TRAIN'] },
      });

      expect(session.user.id).toBe('usr-new-1');
      expect(session.user.email).toBe('rahul@example.in');
      expect(session.user).not.toHaveProperty('passwordHash');
      expect(session.token).toBeDefined();

      const decoded = Security.verifyJwt(session.token);
      expect(decoded.userId).toBe('usr-new-1');
      expect(decoded.email).toBe('rahul@example.in');
    });

    it('register should reject duplicate email with 409 DUPLICATE_EMAIL', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'existing-usr',
        email: 'already@taken.com',
      } as any);

      await expect(
        AuthService.register({
          email: 'already@taken.com',
          password: 'Password123!',
          name: 'Existing User',
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 409,
          code: 'DUPLICATE_EMAIL',
        })
      );
    });

    it('login should succeed with valid password and return session token', async () => {
      const rawPassword = 'SecretPass123!';
      const passwordHash = await Security.hashPassword(rawPassword);

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'usr-login-ok',
        email: 'priya@example.in',
        name: 'Priya Patel',
        role: 'USER',
        passwordHash,
        preferences: { defaultTravelStyle: 'MID_RANGE' },
        createdAt: new Date('2026-10-28'),
      } as any);

      const session = await AuthService.login({
        email: 'priya@example.in',
        password: rawPassword,
      });

      expect(session.user.id).toBe('usr-login-ok');
      expect(session.user.email).toBe('priya@example.in');
      expect(session.token).toBeDefined();
    });

    it('login should reject wrong password with 401 UNAUTHORIZED', async () => {
      const passwordHash = await Security.hashPassword('CorrectPassword123!');

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'usr-test',
        email: 'test@example.in',
        passwordHash,
      } as any);

      await expect(
        AuthService.login({
          email: 'test@example.in',
          password: 'IncorrectPassword!',
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 401,
          code: 'UNAUTHORIZED',
        })
      );
    });

    it('login should reject non-existent user with 401 UNAUTHORIZED', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(
        AuthService.login({
          email: 'nonexistent@example.in',
          password: 'AnyPassword!',
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 401,
          code: 'UNAUTHORIZED',
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 5. UserService Anti-IDOR and Tenant Isolation Tests
  // --------------------------------------------------------------------------
  describe('UserService Anti-IDOR & Saved Trip Management', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('duplicateSavedTrip should reject when user is NOT the owner (anti-IDOR)', async () => {
      const savedTripRecord = {
        id: 'saved-trip-100',
        userId: 'usr-victim-real-owner',
        tripId: 'trip-abc',
        trip: { id: 'trip-abc', title: 'Trip to Manali' },
      };

      vi.spyOn(prisma.savedTrip, 'findUnique').mockResolvedValue(savedTripRecord as any);

      // Requester is usr-attacker (attempting to duplicate victim's saved trip)
      await expect(
        UserService.duplicateSavedTrip('usr-attacker', 'saved-trip-100')
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
          code: 'FORBIDDEN',
        })
      );
    });

    it('duplicateSavedTrip should clone trip and create new private copy when user is owner', async () => {
      const origTrip = {
        id: 'orig-trip-1',
        title: 'Goa Holiday',
        origin: 'Mumbai',
        destination: 'Goa',
        departureDate: new Date('2026-12-01'),
        returnDate: new Date('2026-12-05'),
        travelers: 2,
        totalBudget: 20000,
        status: 'PLANNED',
        transportOffers: [
          {
            id: 'offer-1',
            providerId: 'prv-1',
            mode: 'TRAIN',
            category: 'FASTEST',
            operator: 'Konkan Kanya',
            identifier: '10111',
            departureTime: new Date('2026-12-01T23:05:00Z'),
            arrivalTime: new Date('2026-12-02T10:45:00Z'),
            durationMinutes: 700,
            originHub: 'CSMT',
            destinationHub: 'MAO',
            baseFare: 1200,
            taxesAndFees: 0,
            totalCost: 1200,
            currency: 'INR',
            bookingUrl: 'https://irctc.co.in',
            lastSyncedAt: new Date(),
          },
        ],
        itineraryDays: [],
        createdAt: new Date('2026-10-28'),
      };

      const savedTripRecord = {
        id: 'saved-trip-200',
        userId: 'usr-owner-legit',
        tripId: 'orig-trip-1',
        trip: origTrip,
        title: 'Goa Holiday',
        notes: 'Goa Holiday',
        savedAt: new Date('2026-10-28'),
      };

      const clonedTrip = {
        ...origTrip,
        id: 'cloned-trip-new',
        title: 'Goa Holiday (Customized)',
        userId: 'usr-owner-legit',
      };

      const clonedSavedTrip = {
        id: 'new-saved-trip-id',
        userId: 'usr-owner-legit',
        tripId: 'cloned-trip-new',
        title: 'Copy of Goa Holiday',
        notes: 'Goa Holiday',
        savedAt: new Date('2026-10-28'),
        trip: clonedTrip,
      };

      vi.spyOn(prisma.savedTrip, 'findUnique').mockResolvedValue(savedTripRecord as any);
      vi.spyOn(prisma.trip, 'create').mockResolvedValue(clonedTrip as any);
      vi.spyOn(prisma.savedTrip, 'create').mockResolvedValue(clonedSavedTrip as any);

      const result = await UserService.duplicateSavedTrip('usr-owner-legit', 'saved-trip-200');

      expect(result.id).toBe('new-saved-trip-id');
      expect(result.title).toContain('Goa Holiday');
    });

    it('deleteSavedTrip should reject when user is NOT the owner (anti-IDOR)', async () => {
      vi.spyOn(prisma.savedTrip, 'findUnique').mockResolvedValue({
        id: 'saved-target-400',
        userId: 'usr-legit-owner',
      } as any);

      await expect(
        UserService.deleteSavedTrip('usr-malicious-intruder', 'saved-target-400')
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
          code: 'FORBIDDEN',
        })
      );
    });

    it('deleteSavedTrip should succeed when requester is owner', async () => {
      vi.spyOn(prisma.savedTrip, 'findUnique').mockResolvedValue({
        id: 'saved-target-400',
        userId: 'usr-legit-owner',
      } as any);
      vi.spyOn(prisma.savedTrip, 'delete').mockResolvedValue({ id: 'saved-target-400' } as any);

      await expect(
        UserService.deleteSavedTrip('usr-legit-owner', 'saved-target-400')
      ).resolves.not.toThrow();
    });

    it('updatePreferences should merge travel preferences correctly', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'usr-pref-1',
        preferences: { defaultPace: 'RELAXED', dietary: 'VEG' },
      } as any);

      const updatedUser = {
        id: 'usr-pref-1',
        email: 'traveler@test.in',
        name: 'Traveler',
        role: 'USER' as const,
        preferences: {
          defaultPace: 'FAST_PACED',
          dietary: 'VEG',
          preferredTransportModes: ['FLIGHT'],
        },
        createdAt: new Date('2026-10-28'),
      };

      vi.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser as any);

      const res = await UserService.updatePreferences('usr-pref-1', {
        defaultPace: 'FAST_PACED',
        preferredTransportModes: ['FLIGHT'],
      });

      expect(res.preferences?.defaultPace).toBe('FAST_PACED');
      expect(res.preferences?.dietary).toBe('VEG');
    });

    it('favorite destinations management should add and remove favorites uniquely', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'usr-fav-1',
        preferences: { favoriteDestinations: ['Jaipur', 'Udaipur'] },
      } as any);

      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        id: 'usr-fav-1',
        email: 'fav@test.in',
        name: 'Favorite Traveler',
        role: 'USER',
        preferences: { favoriteDestinations: ['Jaipur', 'Udaipur', 'Goa'] },
        createdAt: new Date('2026-10-28'),
      } as any);

      const added = await UserService.addFavorite('usr-fav-1', 'Goa');
      expect(added).toContain('Goa');

      // Now remove Udaipur
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'usr-fav-1',
        preferences: { favoriteDestinations: ['Jaipur', 'Udaipur', 'Goa'] },
      } as any);

      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        id: 'usr-fav-1',
        email: 'fav@test.in',
        name: 'Favorite Traveler',
        role: 'USER',
        preferences: { favoriteDestinations: ['Jaipur', 'Goa'] },
        createdAt: new Date('2026-10-28'),
      } as any);

      const removed = await UserService.removeFavorite('usr-fav-1', 'Udaipur');
      expect(removed).not.toContain('Udaipur');
      expect(removed).toContain('Jaipur');
    });
  });

  // --------------------------------------------------------------------------
  // 6. Controllers and Route Protection Logic
  // --------------------------------------------------------------------------
  describe('Controllers & Protected API Handlers', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('AuthController.logout should clear cookie and return success message', async () => {
      const clearedCookies: string[] = [];
      const res = {
        clearCookie: vi.fn((name: string) => clearedCookies.push(name)),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const req = {} as Request;
      const next = vi.fn();

      await AuthController.logout(req, res, next);

      expect(res.clearCookie).toHaveBeenCalledWith('auth_token', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('Logged out'),
        })
      );
    });

    it('AuthController.me should return 401 UNAUTHORIZED if req.user is missing', async () => {
      const req = {} as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      await AuthController.me(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const err = next.mock.calls[0][0] as AppError;
      expect(err.statusCode).toBe(401);
    });

    it('UserController.getProfile should return 401 UNAUTHORIZED if req.user is missing', async () => {
      const req = {} as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      await UserController.getProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const err = next.mock.calls[0][0] as AppError;
      expect(err.statusCode).toBe(401);
    });

    it('UserController.getProfile should return user profile when authenticated', async () => {
      const req = {
        user: { userId: 'usr-valid-profile', email: 'user@test.in', role: 'USER' },
      } as Request;

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'usr-valid-profile',
        email: 'user@test.in',
        name: 'Valid User',
        role: 'USER',
        preferences: { defaultPace: 'MODERATE' },
        createdAt: new Date('2026-10-28'),
      } as any);

      let responseData: any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn((data: any) => {
          responseData = data;
        }),
      } as unknown as Response;
      const next = vi.fn();

      await UserController.getProfile(req, res, next);

      expect(res.json).toHaveBeenCalled();
      expect(responseData.success).toBe(true);
      expect(responseData.data.id).toBe('usr-valid-profile');
      expect(responseData.data.email).toBe('user@test.in');
    });

    it('UserController.saveTrip should return 401 UNAUTHORIZED if unauthenticated', async () => {
      const req = { body: { tripId: 'trip-1' } } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      await UserController.saveTrip(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const err = next.mock.calls[0][0] as AppError;
      expect(err.statusCode).toBe(401);
    });
  });
});
