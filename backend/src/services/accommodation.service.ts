import { AccommodationRepository, AccommodationFilters } from '../repositories/accommodation.repository.js';
import { TripRepository } from '../repositories/trip.repository.js';
import { AppError } from '../errors/AppError.js';
import { AccommodationRegistry } from '../providers/accommodation/accommodationRegistry.js';
import { AccommodationSearchParams, NormalizedAccommodationOffer } from '../providers/accommodation/types.js';

export class AccommodationService {
  /**
   * Search accommodations directly by destination and filters
   */
  static async searchAccommodations(params: AccommodationSearchParams): Promise<NormalizedAccommodationOffer[]> {
    const registry = AccommodationRegistry.getInstance();
    return registry.search(params);
  }

  /**
   * Fetches verified accommodation options coordinated with trip dates and guest count
   */
  static async getAccommodationsForTrip(tripId: string, filters: AccommodationFilters) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) {
      throw AppError.notFound(`Trip with ID '${tripId}' not found`);
    }

    const checkInDate = trip.departureDate ? new Date(trip.departureDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const checkOutDate = trip.returnDate
      ? new Date(trip.returnDate).toISOString().split('T')[0]
      : new Date(new Date(checkInDate).getTime() + 3 * 86400000).toISOString().split('T')[0];

    const registry = AccommodationRegistry.getInstance();
    const offers = await registry.search({
      destination: trip.destination,
      checkInDate,
      checkOutDate,
      guests: trip.travelers,
      maxPricePerNight: filters.maxPrice,
      type: filters.type as any,
    });

    return {
      destination: trip.destination,
      travelers: trip.travelers,
      checkInDate,
      checkOutDate,
      optionsCount: offers.length,
      accommodations: offers,
    };
  }
}
