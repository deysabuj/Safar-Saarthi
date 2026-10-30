import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../errors/AppError.js';

export class ProviderController {
  static async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const providers = await prisma.provider.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: {
          count: providers.length,
          providers,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSyncLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.params.code as string;
      const provider = await prisma.provider.findUnique({
        where: { code: code.toUpperCase() },
        include: {
          syncLogs: {
            take: 10,
            orderBy: { syncedAt: 'desc' },
          },
        },
      });

      if (!provider) {
        throw AppError.notFound(`Provider with code '${code}' not found`);
      }

      res.status(200).json({
        success: true,
        data: {
          provider: {
            id: provider.id,
            code: provider.code,
            name: provider.name,
            category: provider.category,
            officialUrl: provider.officialUrl,
          },
          syncLogs: provider.syncLogs,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
