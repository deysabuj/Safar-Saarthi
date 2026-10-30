import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError.js';
import { Logger } from '../utils/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data supplied to Safar Saarthi API',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // 2. Custom AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // 3. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    Logger.error(`Prisma Known Error [${err.code}]: ${err.message}`, 'DATABASE_ERROR');

    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_RESOURCE',
          message: 'A unique constraint violation occurred in the database.',
          details: err.meta,
        },
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested database record does not exist.',
        },
      });
      return;
    }

    if (err.code === 'P2003') {
      res.status(400).json({
        success: false,
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Foreign key constraint failed on related database entity.',
          details: err.meta,
        },
      });
      return;
    }
  }

  // 4. Prisma Validation Errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    Logger.error(`Prisma Validation Error: ${err.message}`, 'DATABASE_VALIDATION_ERROR');
    res.status(400).json({
      success: false,
      error: {
        code: 'DATABASE_VALIDATION_ERROR',
        message: 'Database schema validation error occurred.',
      },
    });
    return;
  }

  // 5. Unhandled server exceptions
  Logger.error(`Unhandled Server Exception: ${err.message}`, 'SERVER_EXCEPTION', {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected internal error occurred. Please try again later.'
          : err.message,
    },
  });
}
