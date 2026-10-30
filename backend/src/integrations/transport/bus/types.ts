export interface RedBusPricing {
  baseFare: number;
  gstAndOperatorFee: number;
  totalPayable: number;
}

export interface RedBusHubPoint {
  location: string;
  time: string; // "23:15"
  hubCode: string;
  isNextDay?: boolean;
}

export interface RedBusAvailableBusItem {
  serviceId: string;
  operatorName: string;
  busType: string;
  hasCharging: boolean;
  isSleeper: boolean;
  hasWifi?: boolean;
  hasWaterBottle?: boolean;
  departure: RedBusHubPoint;
  arrival: RedBusHubPoint;
  totalDurationMinutes: number;
  pricing: RedBusPricing;
  availableSeatsCount: number;
  bookingDeepLink: string;
}

export interface RedBusAvailableTripsResponse {
  success: boolean;
  originCity: string;
  destinationCity: string;
  availableBuses: RedBusAvailableBusItem[];
}
