import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);
  req.headers['x-request-id'] = requestId;

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    Logger.info(
      `${req.method} ${req.originalUrl} - ${res.statusCode} (${durationMs}ms)`,
      'HTTP_REQUEST',
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip,
      }
    );
  });

  next();
}
