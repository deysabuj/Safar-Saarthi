import { Router, Request, Response, NextFunction } from 'express';
import { AccommodationService } from '../../services/accommodation.service.js';

export const accommodationRouter = Router();

// GET /api/v1/accommodations
accommodationRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const destination = (req.query.destination as string) || 'Jaipur';
    const type = req.query.type as any;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const checkInDate = (req.query.checkInDate as string) || new Date().toISOString().split('T')[0];
    const checkOutDate =
      (req.query.checkOutDate as string) ||
      new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    const guests = req.query.guests ? Number(req.query.guests) : 2;

    const accommodations = await AccommodationService.searchAccommodations({
      destination,
      type,
      maxPricePerNight: maxPrice,
      checkInDate,
      checkOutDate,
      guests,
    });

    res.status(200).json({
      success: true,
      data: {
        destination,
        count: accommodations.length,
        accommodations,
      },
    });
  } catch (error) {
    next(error);
  }
});
