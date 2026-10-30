import { Request, Response, NextFunction } from 'express';
import { PlacesService } from '../providers/places/placesService.js';
import { AppError } from '../errors/AppError.js';

export class PlaceController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const destination = (req.query.destination as string) || 'Jaipur';
      const category = req.query.category as any;

      const places = await PlacesService.getPlacesForDestination(destination, category);

      res.status(200).json({
        success: true,
        data: {
          destination,
          count: places.length,
          places,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const placeId = req.params.id as string;
      const place = await PlacesService.getPlaceById(placeId);

      if (!place) {
        throw AppError.notFound(`Place with ID '${placeId}' not found`);
      }

      res.status(200).json({
        success: true,
        data: place,
      });
    } catch (error) {
      next(error);
    }
  }
}
