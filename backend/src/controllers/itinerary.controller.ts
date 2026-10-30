import { Request, Response, NextFunction } from 'express';
import { ItineraryService } from '../services/itinerary.service.js';

export class ItineraryController {
  static async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tripId = req.params.id as string;
      const result = await ItineraryService.generateOrGetItinerary(tripId, req.body);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getItinerary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tripId = req.params.id as string;
      const result = await ItineraryService.getItinerary(tripId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tripId = req.params.id as string;
      const result = await ItineraryService.updateItinerary(tripId, req.body);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async validate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tripId = req.params.id as string;
      const report = await ItineraryService.validateTripItinerary(tripId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tripId = req.params.id as string;
      const mapData = await ItineraryService.getTripMapData(tripId);

      res.status(200).json({
        success: true,
        data: mapData,
      });
    } catch (error) {
      next(error);
    }
  }
}
