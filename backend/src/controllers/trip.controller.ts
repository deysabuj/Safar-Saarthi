import { Request, Response, NextFunction } from 'express';
import { TripService } from '../services/trip.service.js';
import { AppError } from '../errors/AppError.js';

export class TripController {
  static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const searchInput = {
        ...req.body,
        userId: req.body.userId || req.user?.userId,
      };

      const { trip, aggregationMeta, providerErrors } = await TripService.searchAndCreateTrip(searchInput);

      res.status(201).json({
        success: true,
        data: {
          trip: {
            id: trip!.id,
            origin: trip!.origin,
            destination: trip!.destination,
            departureDate: trip!.departureDate,
            returnDate: trip!.returnDate,
            travelers: trip!.travelers,
            budget: trip!.totalBudget ? Number(trip!.totalBudget) : null,
            status: trip!.status,
            createdAt: trip!.createdAt,
          },
          transportOffers: trip!.transportOffers,
          searchMeta: aggregationMeta,
          providerErrors: providerErrors.length > 0 ? providerErrors : undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tripId = req.params.id as string;
      const trip = await TripService.getTripById(tripId);

      // Ownership enforcement on private trips
      if (trip.userId && req.user?.role !== 'ADMIN') {
        if (!req.user || req.user.userId !== trip.userId) {
          throw AppError.forbidden('You do not have permission to view this private trip');
        }
      }

      res.status(200).json({
        success: true,
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  static async save(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tripId = req.params.id as string;
      const userId = req.user?.userId || req.body.userId;
      const savedTrip = await TripService.saveTrip(tripId, { ...req.body, userId });

      res.status(200).json({
        success: true,
        data: savedTrip,
      });
    } catch (error) {
      next(error);
    }
  }
}
