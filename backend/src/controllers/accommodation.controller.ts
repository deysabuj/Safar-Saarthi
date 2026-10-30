import { Request, Response, NextFunction } from 'express';
import { AccommodationService } from '../services/accommodation.service.js';

export class AccommodationController {
  static async getAccommodations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        type: req.query.type as any,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      };

      const tripId = req.params.id as string;
      const result = await AccommodationService.getAccommodationsForTrip(tripId, filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
