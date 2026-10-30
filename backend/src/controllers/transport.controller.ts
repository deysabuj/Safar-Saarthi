import { Request, Response, NextFunction } from 'express';
import { TransportService } from '../services/transport.service.js';
import { TransportFilterOptions } from '../repositories/transport.repository.js';

export class TransportController {
  static async getOffers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: TransportFilterOptions = {
        mode: req.query.mode as any,
        category: req.query.category as any,
        maxCost: req.query.maxCost ? Number(req.query.maxCost) : undefined,
        sortBy: req.query.sortBy as any,
      };

      const tripId = req.params.id as string;
      const result = await TransportService.getTransportOffers(tripId, filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
