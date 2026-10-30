import { Router, Request, Response } from 'express';
import type { ServiceHealthResponse } from '@safar-saarthi/shared';

export const healthRouter = Router();

const startTime = Date.now();

healthRouter.get('/health', (_req: Request, res: Response) => {
  const healthResponse: ServiceHealthResponse = {
    status: 'healthy',
    service: 'safar-saarthi-backend',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  };

  res.status(200).json(healthResponse);
});
