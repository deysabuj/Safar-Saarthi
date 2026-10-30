import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { defaultTransportOrchestrator } from '../../integrations/transport/index.js';
import { defaultRankingEngine } from '../../services/comparison/smartRankingEngine.js';
import { validateRequest } from '../../middleware/validate.js';
import { tripSearchSchema } from '../../schemas/trip.schema.js';

export const transportRouter = Router();

// GET /api/v1/transport/search (Query cached/database offers)
transportRouter.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mode = req.query.mode as any;
    const category = req.query.category as any;

    const where: any = {};
    if (mode) where.mode = mode;
    if (category) where.category = category;

    const offers = await prisma.transportOffer.findMany({
      where,
      include: {
        provider: true,
      },
      take: 20,
      orderBy: { totalCost: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: {
        count: offers.length,
        offers,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/transport/search (Live concurrent search across provider adapters)
transportRouter.post(
  '/search',
  validateRequest({ body: tripSearchSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await defaultTransportOrchestrator.search({
        origin: req.body.origin,
        destination: req.body.destination,
        departureDate: req.body.departureDate,
        returnDate: req.body.returnDate,
        travelers: req.body.travelers,
        budgetInInr: req.body.budget,
        preferredModes: req.body.preferredModes,
      });

      const rankedJourneys = defaultRankingEngine.rank(result.offers);

      res.status(200).json({
        success: true,
        data: {
          ...result,
          rankedJourneys,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);
