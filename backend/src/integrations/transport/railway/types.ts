export interface RailwayFareDetails {
  baseFare: number;
  reservationCharge?: number;
  superfastCharge?: number;
  cateringCharge?: number;
  totalFare: number;
  availability: string; // e.g. "AVAILABLE-0042", "WL-0012", "RAC-0004", "REGRET"
  seatsRemaining?: number | null;
}

export interface RailwayTrainBetweenStationsItem {
  trainNumber: string;
  trainName: string;
  fromStnCode: string;
  fromStationName: string;
  toStnCode: string;
  toStationName: string;
  departureTime: string; // "06:00"
  arrivalTime: string;   // "09:50"
  duration: string;      // "03:50"
  durationMinutes: number;
  runningDays: string[];
  avlClasses: string[];  // e.g. ["CC", "EC"] or ["3A", "2A", "1A", "SL"]
  fares: Record<string, RailwayFareDetails | undefined>;
}

export interface RailwayTrainBetweenStationsResponse {
  status: string;
  serverTimestamp?: string;
  trainBtwnStnsList: RailwayTrainBetweenStationsItem[];
}
