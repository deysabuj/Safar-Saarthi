import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const store = new Map<string, RateLimitRecord>();

  // Cleanup expired windows every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetTime <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const key = `${req.baseUrl || ''}${req.path || ''}:${ip}`;
    const now = Date.now();

    let record = store.get(key);
    if (!record || record.resetTime <= now) {
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      store.set(key, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, options.maxRequests - record.count);
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (record.count > options.maxRequests) {
      res.setHeader('Retry-After', retryAfterSeconds);
      return next(
        new AppError(
          options.message || 'Too many authentication attempts. Please try again later.',
          429,
          'RATE_LIMIT_EXCEEDED'
        )
      );
    }

    next();
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Too many authentication attempts from this IP. Please wait a minute and try again.',
});
