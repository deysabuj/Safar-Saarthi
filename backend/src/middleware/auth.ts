import { Request, Response, NextFunction } from 'express';
import { Security, TokenPayload } from '../utils/security.js';
import { AppError } from '../errors/AppError.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Enforces mandatory authentication. Checks Authorization header (Bearer token) or auth cookie.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if ((req as any).cookies?.auth_token) {
      token = (req as any).cookies.auth_token;
    }

    if (!token) {
      return next(AppError.unauthorized('Authentication required to access this resource'));
    }

    const payload = Security.verifyJwt(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication: verifies token if present, but permits unauthenticated guests.
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if ((req as any).cookies?.auth_token) {
      token = (req as any).cookies.auth_token;
    }

    if (token) {
      try {
        const payload = Security.verifyJwt(token);
        req.user = payload;
      } catch {
        // Ignore invalid token on optional paths
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Enforces strict resource ownership to prevent Insecure Direct Object References (IDOR).
 */
export function requireOwnership(getResourceOwnerId: (req: Request) => Promise<string | null | undefined>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(AppError.unauthorized('Authentication required'));
      }

      const ownerId = await getResourceOwnerId(req);

      if (!ownerId) {
        return next(AppError.notFound('Requested resource not found'));
      }

      // Admin role or matching owner ID
      if (req.user.role === 'ADMIN' || req.user.userId === ownerId) {
        return next();
      }

      return next(AppError.forbidden('You do not have permission to view, edit, or delete this private resource'));
    } catch (error) {
      next(error);
    }
  };
}
