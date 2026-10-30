/**
 * Safar Saarthi - Shared Types and Constants
 */

export type TravelMode = 'FLIGHT' | 'TRAIN' | 'BUS' | 'CAB_TRANSFER';

export type TransportCategory = 'CHEAPEST' | 'FASTEST' | 'BEST_VALUE';

export type BookingProvider =
  | 'IRCTC'
  | 'MAKEMYTRIP'
  | 'EASEMYTRIP'
  | 'REDBUS'
  | 'ABHIBUS'
  | 'INDIGO'
  | 'AIR_INDIA'
  | 'SPICEJET'
  | 'AKASA_AIR'
  | 'OFFICIAL_STATE_TRANSPORT';

export interface ServiceHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  environment: string;
  uptimeSeconds?: number;
}

export interface TravelSearchQuery {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  travelers: number;
  budgetInInr?: number;
  preferredModes?: TravelMode[];
}

export type OfferDataSource = 'LIVE' | 'CACHED' | 'DEMO';

export interface ProviderAttribution {
  provider: BookingProvider;
  displayName: string;
  officialBookingUrl: string;
  lastCheckedTimestamp: string;
  isDemonstrationData: boolean;
  dataSource: OfferDataSource;
  notes?: string;
}

export interface TransportOption {
  id: string;
  mode: TravelMode;
  category: TransportCategory;
  operator: string;
  identifier: string; // e.g. Train number "12951" or Flight code "6E-205"
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  originHub: string; // e.g. "DEL - Indira Gandhi Intl" or "NDLS - New Delhi"
  destinationHub: string;
  baseFareInr: number;
  taxesAndFeesInr: number;
  totalCostInr: number;
  availableSeats?: number;
  seatClass?: string; // "3AC", "Economy", "Sleeper", "AC Seater"
  attribution: ProviderAttribution;
  transferDetails?: {
    firstMileEstMinutes: number;
    firstMileCostInr: number;
    lastMileEstMinutes: number;
    lastMileCostInr: number;
    description: string;
  };
}

export type ActivityCategory =
  | 'HERITAGE'
  | 'FOOD'
  | 'NATURE'
  | 'SHOPPING'
  | 'CULTURE'
  | 'RELAXATION';

export interface TransferEstimate {
  fromLocation: string;
  toLocation: string;
  fromCoordinates?: { latitude: number; longitude: number };
  toCoordinates?: { latitude: number; longitude: number };
  mode: 'CAB_TRANSFER' | 'AUTO_RICKSHAW' | 'WALK' | 'METRO';
  distanceKm: number;
  estimatedDurationMinutes: number;
  estimatedCostInr: number;
  isEstimated: true;
  disclaimer: string;
}

export interface ActivityItem {
  id: string;
  placeId?: string;
  timeSlot: string; // e.g. "09:30 AM - 12:00 PM"
  title: string;
  location: string;
  description: string;
  entryFeeInr: number;
  durationMinutes: number;
  category: ActivityCategory;
  insiderTip?: string;
  bestTimeToVisit?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  requiresConfirmation?: boolean;
  confirmationNote?: string;
  orderIndex?: number;
  transferFromPrevious?: TransferEstimate;
}

export interface ItineraryCheckEvent {
  hotelName: string;
  timeSlot: string;
  neighborhood?: string;
  note?: string;
}

export interface ItineraryDay {
  id?: string;
  dayNumber: number;
  theme: string;
  date: string;
  activities: ActivityItem[];
  dailyBudgetEstimateInr: number;
  localTransportTip?: string;
  checkInEvent?: ItineraryCheckEvent;
  checkOutEvent?: ItineraryCheckEvent;
}

export type AccommodationType =
  | 'HERITAGE_HAVELI'
  | 'HOTEL'
  | 'RESORT'
  | 'BOUTIQUE_HOMESTAY'
  | 'HOSTEL';

export interface AccommodationRecommendation {
  id: string;
  name: string;
  type: AccommodationType;
  neighborhood: string;
  proximityToHub: string;
  pricePerNightInr: number;
  totalStayInr?: number;
  nights?: number;
  rating: number;
  reviewsCount: number;
  amenities: string[];
  checkInDate?: string;
  checkOutDate?: string;
  latitude?: number;
  longitude?: number;
  bookingUrl?: string;
  attribution: ProviderAttribution;
}

export interface ItineraryValidationIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  dayNumber: number;
  activityTitle?: string;
  code:
    | 'TEMPORAL_OUT_OF_BOUNDS'
    | 'INSUFFICIENT_BUFFER'
    | 'OPERATING_HOURS_MISMATCH'
    | 'BACKTRACKING_DETECTED'
    | 'UNVERIFIED_DATA';
  message: string;
}

export interface ItineraryValidationReport {
  isValid: boolean;
  score: number; // 0 - 100
  issues: ItineraryValidationIssue[];
  antiBacktrackingSummary: string;
  bufferSummary: string;
}

export interface MapMarker {
  id: string;
  dayNumber?: number;
  orderIndex?: number;
  type: 'TRANSIT_ARRIVAL' | 'TRANSIT_DEPARTURE' | 'ACCOMMODATION' | 'ACTIVITY' | 'DINING';
  title: string;
  description?: string;
  locationName: string;
  latitude: number;
  longitude: number;
  timeSlot?: string;
  category?: string;
  requiresConfirmation?: boolean;
}

export interface MapRouteLeg {
  dayNumber: number;
  fromMarkerId: string;
  toMarkerId: string;
  fromName: string;
  toName: string;
  distanceKm: number;
  estimatedMinutes: number;
  mode: string;
  isEstimated: true;
}

export interface TripMapData {
  tripId: string;
  destination: string;
  center: { latitude: number; longitude: number };
  zoom: number;
  markers: MapMarker[];
  routeLegs: MapRouteLeg[];
  disclaimer: string;
}

export interface ItineraryPlan {
  id: string;
  title: string;
  origin: string;
  destination: string;
  durationDays: number;
  travelers: number;
  pace: 'RELAXED' | 'MODERATE' | 'FAST_PACED';
  style: 'BUDGET' | 'MID_RANGE' | 'LUXURY';
  dietary: 'VEG' | 'JAIN' | 'NON_VEG' | 'ANY';
  interests: string[];
  selectedTransport: TransportOption;
  recommendedStay: AccommodationRecommendation;
  days: ItineraryDay[];
  budgetBreakdown: {
    transportTotalInr: number;
    stayTotalInr: number;
    activitiesTotalInr: number;
    foodEstimatedInr: number;
    grandTotalInr: number;
    userBudgetInr?: number;
  };
  validationReport?: ItineraryValidationReport;
  mapData?: TripMapData;
  isCustomized?: boolean;
}

export interface UserTravelPreferences {
  defaultPace?: 'RELAXED' | 'MODERATE' | 'FAST_PACED';
  preferredTransportModes?: TravelMode[];
  dietary?: 'VEG' | 'JAIN' | 'NON_VEG' | 'ANY';
  defaultTravelStyle?: 'BUDGET' | 'MID_RANGE' | 'LUXURY';
  budgetLimitInr?: number;
  favoriteDestinations?: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  preferences?: UserTravelPreferences;
  createdAt: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  expiresAt: string;
}

export interface SearchHistoryItem {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  travelers: number;
  budgetInr?: number;
  preferredModes?: TravelMode[];
  searchedAt: string;
}

export interface SavedTrip {
  id: string;
  userId?: string;
  tripId?: string;
  title: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  travelers: number;
  estimatedTotalInr: number;
  transportMode: TravelMode;
  notes?: string;
  createdAt: string;
  savedAt?: string;
  itineraryPlan?: ItineraryPlan;
}

// -------------------------------------------------------------
// Smart Comparison Engine & Deterministic Total-Cost Model
// -------------------------------------------------------------

export interface CostComponentItem {
  id: string;
  category: 'BASE_FARE' | 'MANDATORY_FEES' | 'BAGGAGE' | 'FIRST_MILE' | 'INTERCHANGE' | 'LAST_MILE' | 'OTHER';
  label: string;
  amountInr: number;
  isMandatory: boolean;
  isEstimated: boolean;
  notes?: string;
}

export interface ItemizedCostBreakdown {
  baseFareInr: number;
  mandatoryTaxesAndFeesInr: number;
  baggageFeesInr: number;
  firstMileTransferInr: number;
  interchangeCostsInr: number;
  lastMileTransferInr: number;
  otherExpensesInr: number;
  /** Total calculated out-of-pocket journey cost in INR */
  totalJourneyCostInr: number;
  currency: string;
  currencyExchangeRate?: number;
  currencyExchangeTimestamp?: string;
  hasMissingCostComponents: boolean;
  missingCostComponents: string[];
  components: CostComponentItem[];
}

export interface JourneyLeg {
  legOrder: number;
  mode: TravelMode;
  operator: string;
  identifier: string;
  originHub: string;
  destinationHub: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  baseFareInr: number;
  mandatoryFeesInr: number;
  seatClass?: string;
  bookingUrl?: string;
}

export interface JourneyConnection {
  fromHub: string;
  toHub: string;
  layoverMinutes: number;
  interchangeCostInr: number;
  isTerminalChange: boolean;
  isStationChange: boolean;
  isValidConnection: boolean;
  validationIssue?: string;
}

export type DataQualityRating =
  | 'VERIFIED_COMPLETE'
  | 'VERIFIED_PARTIAL'
  | 'ESTIMATED'
  | 'CACHED'
  | 'INCOMPLETE';

export interface JourneyTradeOffs {
  priceDiffFromCheapestInr: number;
  durationDiffFromFastestMinutes: number;
  convenienceRating: number; // 1-10
  valueScore: number;
  tradeOffSummary: string;
}

export interface RankedJourneyOption extends TransportOption {
  legs?: JourneyLeg[];
  connections?: JourneyConnection[];
  itemizedCost: ItemizedCostBreakdown;
  dataQuality: DataQualityRating;
  tradeOffs: JourneyTradeOffs;
}

// Re-export centralized Location & City Catalog
export {
  type LocationHub,
  type LocationCoordinates,
  type CityLocation,
  CITY_LOCATIONS,
  searchLocations,
  resolveLocation,
  isValidCityInput,
  findCityById,
} from './locations.js';

// Re-export centralized Corridor & Route Benchmarks
export {
  type RawBenchmarkItem,
  type CorridorDefinition,
  CORRIDOR_BENCHMARKS,
  findCorridor,
  isSupportedCorridor,
  getCorridorBenchmarkOptions,
  getRawCorridorOffersByMode,
  getSupportedCorridorsList,
} from './benchmarks.js';


