export type { TravelMode, TransportCategory, OfferDataSource, BookingProvider } from '@safar-saarthi/shared';
import type { TravelMode, TransportCategory, OfferDataSource, BookingProvider } from '@safar-saarthi/shared';

export type AvailabilityStatus = 'AVAILABLE' | 'WAITLIST' | 'RAC' | 'SOLD_OUT' | 'UNKNOWN';

export interface TimePoint {
  /** ISO 8601 with timezone offset, e.g. 2026-11-20T06:00:00+05:30 */
  timestamp: string;
  /** IANA timezone identifier, typically Asia/Kolkata for India */
  timezone: string;
  /** Hub code (e.g. DEL, NDLS, JAI, BOM) */
  hubCode: string;
  /** Full hub/terminal/station name */
  hubName: string;
  /** City name */
  city: string;
}

export interface TransferCostEstimate {
  firstMileInr?: number;
  lastMileInr?: number;
  isEstimate: boolean;
  notes?: string;
}

export interface PriceBreakdown {
  /** Base fare before taxes/surcharges */
  baseFare: number;
  /** Mandatory government and operator taxes, airport fees, or railway reservation surcharges */
  mandatoryTaxesAndFees: number;
  /** Optional service/convenience charges */
  serviceCharges?: number;
  /** Direct ticket total (baseFare + mandatoryTaxesAndFees + serviceCharges) */
  ticketTotal: number;
  currency: string;
  /**
   * Transfer cost to and from hubs.
   * MUST be null if unknown — missing transfer costs must not be treated as 0.
   */
  transferCostEstimate: TransferCostEstimate | null;
  /** Estimated overall out-of-pocket cost (ticketTotal + transfer if known) */
  estimatedGrandTotal: number;
}

export interface OfferAvailability {
  status: AvailabilityStatus;
  /** Exact seats remaining, or null if unknown / not reported */
  seatsRemaining: number | null;
  seatClass: string | null;
  quota?: string; // e.g. "GN" (General), "TQ" (Tatkal)
}

export interface OfferBooking {
  /** Verified official reservation deep-link */
  url: string;
  isOfficialDeepLink: boolean;
  partnerName?: string;
}

export interface FlightSpecificDetails {
  flightNumber: string;
  cabinClass: string;
  stops: number;
  baggageAllowanceKg?: number;
  mealIncluded?: boolean;
}

export interface TrainSpecificDetails {
  trainNumber: string;
  trainName: string;
  seatClassCode: string;
  tatkalQuotaAvailable?: boolean;
  pantryCarAvailable?: boolean;
}

export interface BusSpecificDetails {
  busType: string;
  operatorName: string;
  hasChargingPoint?: boolean;
  isSleeper?: boolean;
  boardingPoint?: string;
  droppingPoint?: string;
}

export interface ModeSpecificDetails {
  flight?: FlightSpecificDetails;
  train?: TrainSpecificDetails;
  bus?: BusSpecificDetails;
}

export interface NormalizedTransportOffer {
  /** Unique system-wide offer identifier */
  id: string;
  /** Natural fingerprint for deduplication: e.g. "TRAIN:IRCTC:20977:2026-11-20T06:00:00+05:30:NDLS:JP" */
  naturalKey: string;
  providerCode: BookingProvider | string;
  providerName: string;
  mode: TravelMode;
  category: TransportCategory;
  operator: string;
  identifier: string; // e.g. "20977 Vande Bharat Express", "6E-205"
  origin: TimePoint;
  destination: TimePoint;
  durationMinutes: number;
  price: PriceBreakdown;
  availability: OfferAvailability;
  booking: OfferBooking;
  lastCheckedTimestamp: string;
  dataSource: {
    type: OfferDataSource;
    isDemonstration: boolean;
    attributionNotes?: string;
  };
  details?: ModeSpecificDetails;
}

export interface TransportQuery {
  origin: string;
  destination: string;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  travelers: number;
  budgetInInr?: number;
  preferredModes?: TravelMode[];
  preferredClass?: string;
  signal?: AbortSignal;
}

export interface TransportProvider {
  readonly code: BookingProvider | string;
  readonly name: string;
  readonly mode: TravelMode;
  readonly isEnabled: boolean;
  search(query: TransportQuery): Promise<NormalizedTransportOffer[]>;
  healthCheck?(): Promise<boolean>;
}

export interface FlightProvider extends TransportProvider {
  readonly mode: 'FLIGHT';
}

export interface TrainProvider extends TransportProvider {
  readonly mode: 'TRAIN';
}

export interface BusProvider extends TransportProvider {
  readonly mode: 'BUS';
}

export interface ProviderExecutionError {
  providerCode: string;
  message: string;
  isTransient: boolean;
  statusCode?: number;
}

export interface SearchAggregationResult {
  tripId?: string;
  offers: NormalizedTransportOffer[];
  errors: ProviderExecutionError[];
  meta: {
    totalOffers: number;
    searchedProviders: string[];
    successfulProviders: string[];
    failedProviders: string[];
    cheapestOfferId?: string;
    fastestOfferId?: string;
    bestValueOfferId?: string;
    executionTimeMs: number;
  };
}
