import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

const startTime = Date.now();

export class HealthController {
  static async getHealth(_req: Request, res: Response): Promise<void> {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    let dbStatus = 'connected';
    let dbLatencyMs: number | null = null;

    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch {
      dbStatus = 'disconnected';
    }

    const isHealthy = dbStatus === 'connected';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'safar-saarthi-backend',
      version: '0.2.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    });
  }
}
