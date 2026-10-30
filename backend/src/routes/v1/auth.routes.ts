import { Router } from 'express';
import { z } from 'zod';
import { AuthController } from '../../controllers/auth.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import { authenticate } from '../../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  preferences: z
    .object({
      defaultPace: z.enum(['RELAXED', 'MODERATE', 'FAST_PACED']).optional(),
      dietary: z.enum(['VEG', 'JAIN', 'NON_VEG', 'ANY']).optional(),
      defaultTravelStyle: z.enum(['BUDGET', 'MID_RANGE', 'LUXURY']).optional(),
      preferredTransportModes: z.array(z.enum(['FLIGHT', 'TRAIN', 'BUS', 'CAB_TRANSFER'])).optional(),
      budgetLimitInr: z.number().positive().optional(),
      favoriteDestinations: z.array(z.string()).optional(),
    })
    .optional(),
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/v1/auth/register
authRouter.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  AuthController.register
);

// POST /api/v1/auth/login
authRouter.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  AuthController.login
);

// POST /api/v1/auth/logout
authRouter.post('/logout', AuthController.logout);

// GET /api/v1/auth/me
authRouter.get('/me', authenticate, AuthController.me);
