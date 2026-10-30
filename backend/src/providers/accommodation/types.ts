import { AccommodationType, ProviderAttribution } from '@safar-saarthi/shared';

export interface AccommodationSearchParams {
  destination: string;
  cityCode?: string; // e.g. "JAI", "DEL", "GOI", "AGR"
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  guests?: number;
  maxPricePerNight?: number;
  type?: AccommodationType;
}

export interface NormalizedAccommodationOffer {
  id: string;
  name: string;
  type: AccommodationType;
  destination: string;
  neighborhood: string;
  proximityToHub: string;
  pricePerNightInr: number;
  totalStayInr: number;
  nights: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  amenities: string[];
  bookingUrl: string;
  checkInDate: string;
  checkOutDate: string;
  latitude: number;
  longitude: number;
  address?: string;
  attribution: ProviderAttribution;
}

export interface IAccommodationProvider {
  readonly providerName: string;
  readonly isAuthorized: boolean;
  search(params: AccommodationSearchParams): Promise<NormalizedAccommodationOffer[]>;
  getDetails(id: string): Promise<NormalizedAccommodationOffer | null>;
}
