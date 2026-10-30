import { z } from 'zod';

export const availabilityStatusEnum = z.enum([
  'AVAILABLE',
  'WAITLIST',
  'RAC',
  'SOLD_OUT',
  'UNKNOWN',
]);

export const travelModeEnum = z.enum(['FLIGHT', 'TRAIN', 'BUS', 'CAB_TRANSFER']);
export const transportCategoryEnum = z.enum(['CHEAPEST', 'FASTEST', 'BEST_VALUE']);

export const timePointSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  timezone: z.string().min(1),
  hubCode: z.string().min(1),
  hubName: z.string().min(1),
  city: z.string().min(1),
});

export const transferCostEstimateSchema = z
  .object({
    firstMileInr: z.number().nonnegative().optional(),
    lastMileInr: z.number().nonnegative().optional(),
    isEstimate: z.boolean(),
    notes: z.string().optional(),
  })
  .nullable();

export const priceBreakdownSchema = z.object({
  baseFare: z.number().nonnegative(),
  mandatoryTaxesAndFees: z.number().nonnegative(),
  serviceCharges: z.number().nonnegative().optional(),
  ticketTotal: z.number().nonnegative(),
  currency: z.string().default('INR'),
  transferCostEstimate: transferCostEstimateSchema,
  estimatedGrandTotal: z.number().nonnegative(),
});

export const offerAvailabilitySchema = z.object({
  status: availabilityStatusEnum,
  seatsRemaining: z.number().int().nonnegative().nullable(),
  seatClass: z.string().nullable(),
  quota: z.string().optional(),
});

export const offerBookingSchema = z.object({
  url: z.string().url(),
  isOfficialDeepLink: z.boolean(),
  partnerName: z.string().optional(),
});

export const normalizedTransportOfferSchema = z.object({
  id: z.string().min(1),
  naturalKey: z.string().min(1),
  providerCode: z.string().min(1),
  providerName: z.string().min(1),
  mode: travelModeEnum,
  category: transportCategoryEnum,
  operator: z.string().min(1),
  identifier: z.string().min(1),
  origin: timePointSchema,
  destination: timePointSchema,
  durationMinutes: z.number().int().positive(),
  price: priceBreakdownSchema,
  availability: offerAvailabilitySchema,
  booking: offerBookingSchema,
  lastCheckedTimestamp: z.string().datetime({ offset: true }),
  dataSource: z.object({
    type: z.enum(['LIVE', 'CACHED', 'DEMO']),
    isDemonstration: z.boolean(),
    attributionNotes: z.string().optional(),
  }),
  details: z
    .object({
      flight: z
        .object({
          flightNumber: z.string(),
          cabinClass: z.string(),
          stops: z.number().int().nonnegative(),
          baggageAllowanceKg: z.number().optional(),
          mealIncluded: z.boolean().optional(),
        })
        .optional(),
      train: z
        .object({
          trainNumber: z.string(),
          trainName: z.string(),
          seatClassCode: z.string(),
          tatkalQuotaAvailable: z.boolean().optional(),
          pantryCarAvailable: z.boolean().optional(),
        })
        .optional(),
      bus: z
        .object({
          busType: z.string(),
          operatorName: z.string(),
          hasChargingPoint: z.boolean().optional(),
          isSleeper: z.boolean().optional(),
          boardingPoint: z.string().optional(),
          droppingPoint: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});
