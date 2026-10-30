import { Router } from 'express';
import { TripController } from '../../controllers/trip.controller.js';
import { TransportController } from '../../controllers/transport.controller.js';
import { AccommodationController } from '../../controllers/accommodation.controller.js';
import { ItineraryController } from '../../controllers/itinerary.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { optionalAuthenticate } from '../../middleware/auth.js';
import {
  tripSearchSchema,
  tripIdParamSchema,
  transportQuerySchema,
  accommodationQuerySchema,
  generateItinerarySchema,
  saveTripSchema,
} from '../../schemas/trip.schema.js';

export const tripRouter = Router();

// Enable optional user context across all trip interactions
tripRouter.use(optionalAuthenticate);

// POST /api/v1/trips/search
tripRouter.post(
  '/search',
  validateRequest({ body: tripSearchSchema }),
  TripController.search
);

// GET /api/v1/trips/:id
tripRouter.get(
  '/:id',
  validateRequest({ params: tripIdParamSchema }),
  TripController.getById
);

// GET /api/v1/trips/:id/transport
tripRouter.get(
  '/:id/transport',
  validateRequest({
    params: tripIdParamSchema,
    query: transportQuerySchema,
  }),
  TransportController.getOffers
);

// GET /api/v1/trips/:id/accommodation
tripRouter.get(
  '/:id/accommodation',
  validateRequest({
    params: tripIdParamSchema,
    query: accommodationQuerySchema,
  }),
  AccommodationController.getAccommodations
);

// POST /api/v1/trips/:id/itinerary
tripRouter.post(
  '/:id/itinerary',
  validateRequest({
    params: tripIdParamSchema,
    body: generateItinerarySchema,
  }),
  ItineraryController.generate
);

// GET /api/v1/trips/:id/itinerary
tripRouter.get(
  '/:id/itinerary',
  validateRequest({ params: tripIdParamSchema }),
  ItineraryController.getItinerary
);

// PUT /api/v1/trips/:id/itinerary
tripRouter.put(
  '/:id/itinerary',
  validateRequest({ params: tripIdParamSchema }),
  ItineraryController.update
);

// POST /api/v1/trips/:id/itinerary/validate
tripRouter.post(
  '/:id/itinerary/validate',
  validateRequest({ params: tripIdParamSchema }),
  ItineraryController.validate
);

// GET /api/v1/trips/:id/map
tripRouter.get(
  '/:id/map',
  validateRequest({ params: tripIdParamSchema }),
  ItineraryController.getMap
);

// POST /api/v1/trips/:id/save
tripRouter.post(
  '/:id/save',
  validateRequest({
    params: tripIdParamSchema,
    body: saveTripSchema,
  }),
  TripController.save
);
