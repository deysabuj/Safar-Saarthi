import { prisma } from '../config/database.js';
import { TripRepository } from '../repositories/trip.repository.js';
import { TransportRepository } from '../repositories/transport.repository.js';
import { TripSearchInput, SaveTripInput } from '../schemas/trip.schema.js';
import { AppError } from '../errors/AppError.js';
import { defaultTransportOrchestrator } from '../integrations/transport/index.js';
import { TravelMode, TransportCategory, OfferDataSource, Prisma } from '@prisma/client';

export class TripService {
  static async searchAndCreateTrip(input: TripSearchInput) {
    const departureDate = new Date(input.departureDate);
    const returnDate = input.returnDate ? new Date(input.returnDate) : undefined;

    // 1. Create Trip record
    const trip = await TripRepository.createTrip({
      origin: input.origin,
      destination: input.destination,
      departureDate,
      returnDate,
      travelers: input.travelers,
      budget: input.budget,
      userId: input.userId,
    });

    // 2. Fetch Providers from database for relational ID mapping
    const providers = await prisma.provider.findMany();
    const providerMap = new Map<string, string>();
    for (const p of providers) {
      providerMap.set(p.code.toUpperCase(), p.id);
    }

    // Default fallback provider if a new adapter code is not yet seeded
    const fallbackProviderId = providers[0]?.id;

    // 3. Orchestrate concurrent search across independent transport providers
    const aggregation = await defaultTransportOrchestrator.search(
      {
        origin: input.origin,
        destination: input.destination,
        departureDate: input.departureDate,
        returnDate: input.returnDate,
        travelers: input.travelers,
        budgetInInr: input.budget,
        preferredModes: input.preferredModes as any,
      },
      trip.id
    );

    // 4. Map normalized transport offers into relational database entities
    const offersToCreate: Prisma.TransportOfferCreateManyInput[] = aggregation.offers.map((offer) => {
      const pId = providerMap.get(offer.providerCode.toUpperCase()) || fallbackProviderId;

      return {
        tripId: trip.id,
        providerId: pId,
        mode: offer.mode as TravelMode,
        category: offer.category as TransportCategory,
        operator: offer.operator,
        identifier: offer.identifier,
        originHub: offer.origin.hubName,
        destinationHub: offer.destination.hubName,
        departureTime: new Date(offer.origin.timestamp),
        arrivalTime: new Date(offer.destination.timestamp),
        durationMinutes: offer.durationMinutes,
        baseFare: offer.price.baseFare,
        taxesAndFees: offer.price.mandatoryTaxesAndFees,
        totalCost: offer.price.ticketTotal,
        currency: offer.price.currency,
        availableSeats: offer.availability.seatsRemaining,
        seatClass: offer.availability.seatClass,
        dataSource: offer.dataSource.type as OfferDataSource,
        bookingUrl: offer.booking.url,
        firstMileCost: offer.price.transferCostEstimate?.firstMileInr ?? null,
        lastMileCost: offer.price.transferCostEstimate?.lastMileInr ?? null,
        transferNotes: offer.price.transferCostEstimate?.notes ?? null,
      };
    });

    // 5. Bulk insert normalized offers into PostgreSQL
    if (offersToCreate.length > 0) {
      await TransportRepository.createMany(offersToCreate);
    }

    // 6. Return the full trip with transport offers and search orchestration metadata
    const completeTrip = await TripRepository.findById(trip.id);

    return {
      trip: completeTrip,
      aggregationMeta: aggregation.meta,
      providerErrors: aggregation.errors,
    };
  }

  static async getTripById(tripId: string) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) {
      throw AppError.notFound(`Trip with ID '${tripId}' not found`);
    }
    return trip;
  }

  static async saveTrip(tripId: string, input: SaveTripInput) {
    const saved = await TripRepository.saveTrip({
      tripId,
      userId: input.userId,
      title: input.title,
      notes: input.notes,
    });

    if (!saved) {
      throw AppError.notFound(`Cannot save trip: Trip with ID '${tripId}' not found`);
    }

    return saved;
  }
}
