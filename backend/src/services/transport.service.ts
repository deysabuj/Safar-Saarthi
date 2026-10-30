import { TransportRepository, TransportFilterOptions } from '../repositories/transport.repository.js';
import { TripRepository } from '../repositories/trip.repository.js';
import { AppError } from '../errors/AppError.js';

export class TransportService {
  static async getTransportOffers(tripId: string, filters: TransportFilterOptions) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) {
      throw AppError.notFound(`Trip with ID '${tripId}' not found`);
    }

    const offers = await TransportRepository.findByTripId(tripId, filters);

    // Compute comparative summary statistics
    const lowestCost = offers.reduce(
      (min, o) => (Number(o.totalCost) < min ? Number(o.totalCost) : min),
      offers.length > 0 ? Number(offers[0].totalCost) : 0
    );

    const fastestDurationMinutes = offers.reduce(
      (min, o) => (o.durationMinutes < min ? o.durationMinutes : min),
      offers.length > 0 ? offers[0].durationMinutes : 0
    );

    return {
      trip: {
        id: trip.id,
        origin: trip.origin,
        destination: trip.destination,
        departureDate: trip.departureDate,
        travelers: trip.travelers,
        budget: trip.totalBudget ? Number(trip.totalBudget) : null,
      },
      summary: {
        totalOffers: offers.length,
        lowestCostInr: lowestCost,
        fastestDurationMinutes,
      },
      offers,
    };
  }
}
