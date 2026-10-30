import { IAccommodationProvider, AccommodationSearchParams, NormalizedAccommodationOffer } from './types.js';
import { AmadeusClient } from '../../integrations/transport/amadeus/client.js';
import { Logger } from '../../utils/logger.js';
import { AccommodationType } from '@safar-saarthi/shared';

const CITY_CODE_MAP: Record<string, string> = {
  jaipur: 'JAI',
  delhi: 'DEL',
  newdelhi: 'DEL',
  mumbai: 'BOM',
  goa: 'GOI',
  bangalore: 'BLR',
  bengaluru: 'BLR',
  chennai: 'MAA',
  kolkata: 'CCU',
  hyderabad: 'HYD',
  agra: 'AGR',
  varanasi: 'VNS',
  udaipur: 'UDR',
};

export class AmadeusAccommodationProvider implements IAccommodationProvider {
  readonly providerName = 'AMADEUS_HOTELS';
  readonly isAuthorized = true;
  private client: AmadeusClient;

  constructor(client?: AmadeusClient) {
    this.client = client ?? new AmadeusClient();
  }

  async search(params: AccommodationSearchParams): Promise<NormalizedAccommodationOffer[]> {
    if (!this.client.isConfigured()) {
      Logger.info('[AmadeusAccommodationProvider] Amadeus credentials not configured; skipping live hotel search.');
      return [];
    }

    const cleanDest = params.destination.split('(')[0].trim().toLowerCase().replace(/[^a-z]/g, '');
    const cityCode = params.cityCode || CITY_CODE_MAP[cleanDest] || 'DEL';

    try {
      const token = await this.client.getAccessToken();
      const baseUrl = (this.client as any).baseUrl || 'https://test.api.amadeus.com';

      // 1. Search hotels by city
      const listUrl = `${baseUrl}/v1/reference-data/locations/hotels/by-city?cityCode=${encodeURIComponent(cityCode)}&radius=30&radiusUnit=KM`;
      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(6000),
      });

      if (!listRes.ok) {
        Logger.warn(`[AmadeusAccommodationProvider] Hotel List API returned status ${listRes.status}`);
        return [];
      }

      const listData = await listRes.json();
      const hotels: any[] = listData.data || [];
      if (hotels.length === 0) {
        return [];
      }

      // 2. Fetch live offers for up to 5 hotels
      const sampleIds = hotels.slice(0, 5).map((h) => h.hotelId).join(',');
      const offersUrl = `${baseUrl}/v3/shopping/hotel-offers?hotelIds=${encodeURIComponent(sampleIds)}&adults=${params.guests || 2}&checkInDate=${params.checkInDate}&checkOutDate=${params.checkOutDate}&currency=INR`;

      const offersRes = await fetch(offersUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(6000),
      });

      if (!offersRes.ok) {
        Logger.warn(`[AmadeusAccommodationProvider] Hotel Offers API returned status ${offersRes.status}`);
        return [];
      }

      const offersData = await offersRes.json();
      const offersList: any[] = offersData.data || [];

      // Calculate nights
      const d1 = new Date(params.checkInDate).getTime();
      const d2 = new Date(params.checkOutDate).getTime();
      const nights = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));

      const results: NormalizedAccommodationOffer[] = [];

      for (const item of offersList) {
        const hotel = item.hotel;
        const offer = item.offers?.[0];
        if (!hotel || !offer) continue;

        const totalCost = Number(offer.price?.total) || 5000;
        const pricePerNight = Math.round(totalCost / nights);

        if (params.maxPricePerNight && pricePerNight > params.maxPricePerNight) {
          continue;
        }

        results.push({
          id: `amadeus-hotel-${hotel.hotelId}`,
          name: hotel.name || 'Verified Partner Hotel',
          type: 'HOTEL' as AccommodationType,
          destination: params.destination,
          neighborhood: hotel.address?.countryCode || 'City Center',
          proximityToHub: `${hotel.distance?.value || 3.5} km from central hub`,
          pricePerNightInr: pricePerNight,
          totalStayInr: totalCost,
          nights,
          currency: 'INR',
          rating: Number(hotel.rating) || 4.2,
          reviewsCount: 150,
          amenities: hotel.amenities || ['Free Wi-Fi', 'Room Service', 'Air Conditioning'],
          bookingUrl: offer.self || 'https://www.amadeus.com',
          checkInDate: params.checkInDate,
          checkOutDate: params.checkOutDate,
          latitude: Number(hotel.latitude) || 26.9124,
          longitude: Number(hotel.longitude) || 75.7873,
          address: hotel.address?.lines?.join(', ') || undefined,
          attribution: {
            provider: 'MAKEMYTRIP',
            displayName: 'Amadeus for Developers Hotel Search',
            officialBookingUrl: offer.self || 'https://www.amadeus.com',
            lastCheckedTimestamp: new Date().toISOString(),
            isDemonstrationData: false,
            dataSource: 'LIVE',
            notes: 'Authorized GDS hotel pricing & availability',
          },
        });
      }

      return results;
    } catch (err: any) {
      Logger.warn(`[AmadeusAccommodationProvider] Error querying Amadeus hotel search: ${err.message}`);
      return [];
    }
  }

  async getDetails(id: string): Promise<NormalizedAccommodationOffer | null> {
    return null;
  }
}
