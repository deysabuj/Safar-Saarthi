/**
 * Amadeus for Developers API Types
 */

export interface AmadeusOAuthTokenResponse {
  type: string;
  username: string;
  application_name: string;
  client_id: string;
  token_type: string;
  access_token: string;
  expires_in: number;
  state: string;
  scope: string;
}

export interface AmadeusFlightSegment {
  departure: {
    iataCode: string;
    terminal?: string;
    at: string; // "2026-11-20T08:15:00"
  };
  arrival: {
    iataCode: string;
    terminal?: string;
    at: string;
  };
  carrierCode: string; // e.g. "6E", "AI", "UK"
  number: string; // e.g. "205"
  aircraft: {
    code: string; // e.g. "320"
  };
  operating?: {
    carrierCode?: string;
  };
  duration: string; // ISO 8601 e.g. "PT1H5M"
  id: string;
  numberOfStops: number;
  blacklistedInEU?: boolean;
}

export interface AmadeusFlightItinerary {
  duration: string; // "PT1H5M"
  segments: AmadeusFlightSegment[];
}

export interface AmadeusPriceFee {
  amount: string;
  type: string;
}

export interface AmadeusFlightPrice {
  currency: string;
  total: string;
  base: string;
  fees?: AmadeusPriceFee[];
  grandTotal: string;
}

export interface AmadeusTravelerPricing {
  travelerId: string;
  fareOption: string;
  travelerType: string;
  price: AmadeusFlightPrice;
  fareDetailsBySegment: {
    segmentId: string;
    cabin: string; // "ECONOMY", "BUSINESS", etc.
    fareBasis: string;
    class: string;
    includedCheckedBags?: {
      weight?: number;
      weightUnit?: string;
      quantity?: number;
    };
  }[];
}

export interface AmadeusFlightOffer {
  type: 'flight-offer';
  id: string;
  source: 'GDS' | string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate: string;
  numberOfBookableSeats: number;
  itineraries: AmadeusFlightItinerary[];
  price: AmadeusFlightPrice;
  pricingOptions: {
    fareType: string[];
    includedCheckedBagsOnly: boolean;
  };
  validatingAirlineCodes: string[];
  travelerPricings: AmadeusTravelerPricing[];
}

export interface AmadeusFlightOffersResponse {
  meta?: {
    count: number;
    links?: {
      self: string;
    };
  };
  data: AmadeusFlightOffer[];
  dictionaries?: {
    locations?: Record<string, { cityCode: string; countryCode: string }>;
    aircraft?: Record<string, string>;
    currencies?: Record<string, string>;
    carriers?: Record<string, string>; // e.g. {"6E": "INDIGO", "AI": "AIR INDIA"}
  };
  errors?: {
    status: number;
    code: number;
    title: string;
    detail: string;
  }[];
}
