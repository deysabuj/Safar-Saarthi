import { z } from 'zod';

export const travelModeEnum = z.enum(['FLIGHT', 'TRAIN', 'BUS', 'CAB_TRANSFER']);
export const transportCategoryEnum = z.enum(['CHEAPEST', 'FASTEST', 'BEST_VALUE']);

export const tripIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Trip ID must be a valid UUID' }),
});

export const tripSearchSchema = z
  .object({
    origin: z.string().min(2, { message: 'Origin must be at least 2 characters long' }),
    destination: z.string().min(2, { message: 'Destination must be at least 2 characters long' }),
    departureDate: z.string().refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'Departure date must be a valid date format (e.g. YYYY-MM-DD)' }
    ),
    returnDate: z
      .string()
      .optional()
      .refine(
        (val) => !val || !isNaN(Date.parse(val)),
        { message: 'Return date must be a valid date format' }
      ),
    travelers: z.coerce.number().int().min(1).max(20).default(1),
    budget: z.coerce.number().positive().optional(),
    preferredModes: z.array(travelModeEnum).optional(),
    userId: z.string().uuid().optional(),
  })
  .refine(
    (data) => data.origin.trim().toLowerCase() !== data.destination.trim().toLowerCase(),
    {
      message: 'Origin and destination hubs cannot be identical',
      path: ['destination'],
    }
  );

export const transportQuerySchema = z.object({
  mode: travelModeEnum.optional(),
  category: transportCategoryEnum.optional(),
  maxCost: z.coerce.number().positive().optional(),
  sortBy: z.enum(['CHEAPEST', 'FASTEST', 'BEST_VALUE']).optional().default('BEST_VALUE'),
});

export const accommodationQuerySchema = z.object({
  type: z
    .enum(['HERITAGE_HAVELI', 'HOTEL', 'RESORT', 'BOUTIQUE_HOMESTAY', 'HOSTEL'])
    .optional(),
  maxPrice: z.coerce.number().positive().optional(),
});

export const generateItinerarySchema = z.object({
  pace: z.enum(['RELAXED', 'MODERATE', 'FAST_PACED']).default('MODERATE'),
  style: z.enum(['BUDGET', 'MID_RANGE', 'LUXURY']).default('MID_RANGE'),
  dietary: z.enum(['VEG', 'JAIN', 'NON_VEG', 'ANY']).default('VEG'),
  days: z.coerce.number().int().min(1).max(14).default(3),
  selectedTransportId: z.string().uuid().optional(),
});

export const saveTripSchema = z.object({
  userId: z.string().uuid().optional(),
  title: z.string().min(1).optional(),
  notes: z.string().max(1000).optional(),
});

export type TripSearchInput = z.infer<typeof tripSearchSchema>;
export type TransportQueryInput = z.infer<typeof transportQuerySchema>;
export type AccommodationQueryInput = z.infer<typeof accommodationQuerySchema>;
export type GenerateItineraryInput = z.infer<typeof generateItinerarySchema>;
export type SaveTripInput = z.infer<typeof saveTripSchema>;
