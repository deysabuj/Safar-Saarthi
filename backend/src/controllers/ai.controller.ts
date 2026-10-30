import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AgentRunStatus } from '@prisma/client';
import { AiService } from '../services/ai.service.js';

export class AiController {
  static async planTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await AiService.planTrip(req.body);
      res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }
  static async getRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tripId = req.params.tripId as string;
      const runs = await prisma.agentRun.findMany({
        where: { tripId },
        orderBy: { startedAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: {
          tripId,
          count: runs.length,
          agentRuns: runs,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async recordRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tripId, agentName, inputPayload, outputPayload, status, durationMs } = req.body;

      const run = await prisma.agentRun.create({
        data: {
          tripId,
          agentName: agentName || 'COORDINATOR',
          inputPayload: inputPayload || {},
          outputPayload: outputPayload || null,
          status: status || AgentRunStatus.COMPLETED,
          durationMs: durationMs || 0,
          completedAt: new Date(),
        },
      });

      res.status(201).json({
        success: true,
        data: run,
      });
    } catch (error) {
      next(error);
    }
  }
}
