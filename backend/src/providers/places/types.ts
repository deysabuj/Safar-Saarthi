import { ActivityCategory } from '@safar-saarthi/shared';

export interface PlaceItem {
  id: string;
  destination: string;
  title: string;
  location: string;
  address: string;
  category: ActivityCategory;
  description: string;
  entryFeeInr: number;
  currency: string;
  typicalDurationMinutes: number;
  insiderTip?: string;
  bestTimeToVisit?: string;
  latitude: number;
  longitude: number;
  openingHours?: string; // e.g. "09:00 AM - 05:30 PM"
  closedDays?: string[]; // e.g. ["Monday"]
  requiresConfirmation?: boolean;
  confirmationNote?: string;
  officialUrl?: string;
}

export interface IPlacesProvider {
  readonly providerName: string;
  getPlaces(destination: string, category?: ActivityCategory): Promise<PlaceItem[]>;
  getPlaceById(id: string): Promise<PlaceItem | null>;
}
