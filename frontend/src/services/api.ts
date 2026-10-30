import type {
  TravelSearchQuery,
  TransportOption,
  ItineraryPlan,
  SavedTrip,
  TravelMode,
  TransportCategory,
} from '@safar-saarthi/shared';
import { resolveLocation } from '@safar-saarthi/shared';
import {
  MOCK_ITINERARY_PLAN,
  MOCK_SAVED_TRIPS,
  getRouteBenchmarkOptions,
} from './fixtures';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SAVED_TRIPS_STORAGE_KEY = 'safar_saarthi_saved_trips_v1';

export class TravelApiService {
  /**
   * Search multi-modal transport options across Flights, Trains, and Buses
   */
  static async searchTransport(
    query: TravelSearchQuery,
    token?: string | null
  ): Promise<{
    tripId?: string;
    options: TransportOption[];
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/v1/trips/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          origin: query.origin,
          destination: query.destination,
          departureDate: query.departureDate,
          returnDate: query.returnDate,
          travelers: query.travelers,
          budget: query.budgetInInr,
          preferredModes: query.preferredModes,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.transportOffers) {
          const tripId = json.data.trip?.id;
          const mappedOptions: TransportOption[] = json.data.transportOffers.map((o: any) => {
            const depTime = new Date(o.departureTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
            const arrTime = new Date(o.arrivalTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });

            return {
              id: o.id,
              mode: o.mode,
              category: o.category,
              operator: o.operator,
              identifier: o.identifier,
              departureTime: depTime,
              arrivalTime: arrTime,
              durationMinutes: o.durationMinutes,
              originHub: o.originHub,
              destinationHub: o.destinationHub,
              baseFareInr: Number(o.baseFare),
              taxesAndFeesInr: Number(o.taxesAndFees),
              totalCostInr: Number(o.totalCost),
              availableSeats: o.availableSeats,
              seatClass: o.seatClass,
              attribution: {
                provider: o.provider?.code || 'IRCTC',
                displayName: o.provider?.name || o.operator,
                officialBookingUrl: o.bookingUrl || o.provider?.officialUrl || 'https://www.irctc.co.in',
                lastCheckedTimestamp: o.lastSyncedAt || new Date().toISOString(),
                isDemonstrationData: o.dataSource === 'DEMO',
                dataSource: o.dataSource || 'DEMO',
                notes: o.transferNotes,
              },
              transferDetails: o.firstMileCost
                ? {
                    firstMileEstMinutes: 30,
                    firstMileCostInr: Number(o.firstMileCost),
                    lastMileEstMinutes: 25,
                    lastMileCostInr: Number(o.lastMileCost || 0),
                    description: o.transferNotes || 'Transfer to/from hub',
                  }
                : undefined,
            };
          });

          const matchingOptions = mappedOptions.filter((opt) =>
            TravelApiService.isOptionMatchingDestination(opt, query.destination)
          );

          return { tripId, options: matchingOptions };
        }
      }
    } catch {
      // Fallback gracefully to route-aware demonstrative fixture data
    }

    // Dynamic route-aware options strictly matching requested corridor
    let options = getRouteBenchmarkOptions(query.origin, query.destination);

    if (query.preferredModes && query.preferredModes.length > 0) {
      options = options.filter((opt) => query.preferredModes!.includes(opt.mode));
    }

    return { options };
  }

  /**
   * Validates whether a transport option matches the user's requested destination
   */
  static isOptionMatchingDestination(option: TransportOption, destination: string): boolean {
    const destClean = destination.toLowerCase().trim();
    const destIata = (destination.match(/\(([A-Z]{3})\)/i)?.[1] || '').toLowerCase();
    const destHub = (option.destinationHub || '').toLowerCase();

    // Check IATA / station code matching
    if (destIata && destHub.includes(destIata)) return true;

    // Check catalog location resolution
    const resolved = resolveLocation(destClean);
    if (resolved) {
      if (
        destHub.includes(resolved.airport.code.toLowerCase()) ||
        destHub.includes(resolved.railway.code.toLowerCase()) ||
        destHub.includes(resolved.name.toLowerCase()) ||
        resolved.aliases.some((alias) => destHub.includes(alias.toLowerCase()))
      ) {
        return true;
      }
    }

    // Check known corridors explicitly
    if (destClean.includes('kanpur') || destClean.includes('cnb') || destClean.includes('knu')) {
      return destHub.includes('cnb') || destHub.includes('knu') || destHub.includes('kanpur');
    }
    if (destClean.includes('varanasi') || destClean.includes('vns') || destClean.includes('bsb')) {
      return (
        destHub.includes('vns') ||
        destHub.includes('bsb') ||
        destHub.includes('varanasi') ||
        destHub.includes('kashi')
      );
    }
    if (destClean.includes('jaipur') || destClean.includes('jai') || destClean.includes('jp')) {
      return destHub.includes('jai') || destHub.includes('jp') || destHub.includes('jaipur');
    }
    if (destClean.includes('mumbai') || destClean.includes('bom') || destClean.includes('csmt')) {
      return destHub.includes('bom') || destHub.includes('csmt') || destHub.includes('mumbai');
    }
    if (destClean.includes('goa') || destClean.includes('goi') || destClean.includes('mao')) {
      return destHub.includes('goi') || destHub.includes('mao') || destHub.includes('goa');
    }

    const cityToken = destClean.split('(')[0].trim();
    return destHub.includes(cityToken) || cityToken.includes(destHub);
  }

  /**
   * Get AI-synthesized itinerary for a destination
   */
  static async getItinerary(params: {
    tripId?: string;
    origin: string;
    destination: string;
    travelers: number;
    days?: number;
    selectedTransportId?: string;
  }): Promise<ItineraryPlan> {
    try {
      if (params.tripId) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`${API_BASE_URL}/v1/trips/${params.tripId}/itinerary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            days: params.days || 3,
            selectedTransportId: params.selectedTransportId,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const data = json.data;
            return {
              id: data.tripId,
              title: data.title,
              origin: data.origin,
              destination: data.destination,
              durationDays: data.durationDays,
              travelers: data.travelers,
              pace: data.pace,
              style: data.style,
              dietary: data.dietary,
              interests: ['HERITAGE', 'FOOD', 'SHOPPING', 'CULTURE'],
              selectedTransport: data.selectedTransport || MOCK_ITINERARY_PLAN.selectedTransport,
              recommendedStay: data.recommendedStay || MOCK_ITINERARY_PLAN.recommendedStay,
              days: data.days.map((d: any) => ({
                dayNumber: d.dayNumber,
                theme: d.theme,
                date: d.date ? new Date(d.date).toLocaleDateString() : `Day ${d.dayNumber}`,
                dailyBudgetEstimateInr: Number(d.dailyBudgetEstimate),
                localTransportTip: d.localTransportTip,
                activities: d.activities.map((a: any) => ({
                  id: a.id,
                  timeSlot: a.timeSlot,
                  title: a.title,
                  location: a.location,
                  description: a.description,
                  entryFeeInr: Number(a.entryFee),
                  durationMinutes: a.durationMinutes,
                  category: a.category,
                  insiderTip: a.insiderTip,
                })),
              })),
              budgetBreakdown: {
                transportTotalInr: data.budgetSummary?.breakdown?.transportTotalInr || 2400,
                stayTotalInr: data.budgetSummary?.breakdown?.accommodationsTotalInr || 6400,
                activitiesTotalInr: data.budgetSummary?.breakdown?.activitiesAndDiningInr || 3200,
                foodEstimatedInr: 2500,
                grandTotalInr: data.budgetSummary?.estimatedGrandTotalInr || 14500,
                userBudgetInr: data.budgetSummary?.userBudgetInr,
              },
            };
          }
        }
      }
    } catch {
      // Fallback to fixture
    }

    // Adapt mock itinerary plan with search context
    const plan = { ...MOCK_ITINERARY_PLAN };
    plan.origin = params.origin || plan.origin;
    plan.destination = params.destination || plan.destination;
    plan.travelers = params.travelers || plan.travelers;

    const routeBenchmark = getRouteBenchmarkOptions(plan.origin, plan.destination);
    if (routeBenchmark.length > 0) {
      plan.selectedTransport = routeBenchmark[0];
    }

    const transportTotal = plan.selectedTransport.totalCostInr * plan.travelers;
    const stayTotal = plan.recommendedStay.pricePerNightInr * (plan.durationDays - 1);
    const activitiesTotal = 800 * plan.durationDays * plan.travelers;
    const foodEstimated = 1000 * plan.durationDays * plan.travelers;

    plan.budgetBreakdown = {
      transportTotalInr: transportTotal,
      stayTotalInr: stayTotal,
      activitiesTotalInr: activitiesTotal,
      foodEstimatedInr: foodEstimated,
      grandTotalInr: transportTotal + stayTotal + activitiesTotal + foodEstimated,
      userBudgetInr: plan.budgetBreakdown.userBudgetInr,
    };

    return plan;
  }

  /**
   * Fetch all saved trips (Remote backend when authenticated, with LocalStorage fallback)
   */
  static async getSavedTrips(token?: string | null): Promise<SavedTrip[]> {
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/v1/users/me/saved-trips`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const mapped: SavedTrip[] = json.data.map((st: any) => {
              const trip = st.trip;
              return {
                id: st.id,
                tripId: st.tripId,
                title: trip?.title || st.notes || `${trip?.destination || 'Journey'} Trip`,
                origin: trip?.origin || 'India',
                destination: trip?.destination || 'Destination',
                departureDate: trip?.departureDate ? new Date(trip.departureDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                travelers: trip?.travelers || 1,
                transportMode: (trip?.transportOffers?.[0]?.mode as TravelMode) || 'TRAIN',
                estimatedTotalInr: Number(trip?.budget) || 12000,
                createdAt: st.savedAt || new Date().toISOString(),
                notes: st.notes,
              };
            });
            TravelApiService.persistSavedTrips(mapped);
            return mapped;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch remote saved trips, falling back to local', e);
      }
    }

    try {
      const stored = localStorage.getItem(SAVED_TRIPS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read saved trips from localStorage', e);
    }
    TravelApiService.persistSavedTrips(MOCK_SAVED_TRIPS);
    return MOCK_SAVED_TRIPS;
  }

  /**
   * Save a trip (Syncs to server if authenticated, always saves locally)
   */
  static async saveTrip(trip: SavedTrip, token?: string | null): Promise<SavedTrip[]> {
    if (token && trip.tripId) {
      try {
        await fetch(`${API_BASE_URL}/v1/users/me/saved-trips`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tripId: trip.tripId,
            notes: trip.title,
          }),
        });
      } catch (e) {
        console.warn('Failed to save trip to backend', e);
      }
    }

    const existing = TravelApiService.getLocalSavedTrips();
    const filtered = existing.filter((t) => t.id !== trip.id);
    const updated = [trip, ...filtered];
    TravelApiService.persistSavedTrips(updated);
    return updated;
  }

  /**
   * Duplicate a saved trip for editing
   */
  static async duplicateTrip(savedTripId: string, token?: string | null): Promise<SavedTrip[]> {
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/v1/users/me/saved-trips/${savedTripId}/duplicate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          // Re-fetch all trips from server
          return await TravelApiService.getSavedTrips(token);
        }
      } catch (e) {
        console.warn('Failed to duplicate trip remotely', e);
      }
    }

    // Local duplication fallback
    const existing = TravelApiService.getLocalSavedTrips();
    const target = existing.find((t) => t.id === savedTripId);
    if (target) {
      const duplicated: SavedTrip = {
        ...target,
        id: `dup-${Date.now()}`,
        title: `${target.title} (Customized)`,
        createdAt: new Date().toISOString(),
      };
      const updated = [duplicated, ...existing];
      TravelApiService.persistSavedTrips(updated);
      return updated;
    }
    return existing;
  }

  /**
   * Remove a saved trip by ID
   */
  static async deleteTrip(tripId: string, token?: string | null): Promise<SavedTrip[]> {
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/v1/users/me/saved-trips/${tripId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.warn('Failed to delete remote saved trip', e);
      }
    }

    const existing = TravelApiService.getLocalSavedTrips();
    const updated = existing.filter((t) => t.id !== tripId);
    TravelApiService.persistSavedTrips(updated);
    return updated;
  }

  static getLocalSavedTrips(): SavedTrip[] {
    try {
      const stored = localStorage.getItem(SAVED_TRIPS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return MOCK_SAVED_TRIPS;
  }

  private static persistSavedTrips(trips: SavedTrip[]): void {
    try {
      localStorage.setItem(SAVED_TRIPS_STORAGE_KEY, JSON.stringify(trips));
    } catch (e) {
      console.error('Failed to persist trips to localStorage', e);
    }
  }

  /**
   * Helper to sort options deterministically
   */
  static sortOptions(
    options: TransportOption[],
    sortBy: TransportCategory | 'DEFAULT'
  ): TransportOption[] {
    const cloned = [...options];

    switch (sortBy) {
      case 'CHEAPEST':
        return cloned.sort((a, b) => a.totalCostInr - b.totalCostInr);
      case 'FASTEST':
        return cloned.sort((a, b) => a.durationMinutes - b.durationMinutes);
      case 'BEST_VALUE':
        return cloned.sort((a, b) => {
          const scoreA = a.totalCostInr * 0.6 + a.durationMinutes * 4;
          const scoreB = b.totalCostInr * 0.6 + b.durationMinutes * 4;
          return scoreA - scoreB;
        });
      default:
        return cloned;
    }
  }

  /**
   * Helper to filter options
   */
  static filterOptions(
    options: TransportOption[],
    filters: {
      mode?: TravelMode | 'ALL';
      maxCost?: number | null;
      maxDurationMinutes?: number | null;
      departureTimeOfDay?: 'ALL' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
    }
  ): TransportOption[] {
    return options.filter((opt) => {
      if (filters.mode && filters.mode !== 'ALL' && opt.mode !== filters.mode) {
        return false;
      }
      if (
        typeof filters.maxCost === 'number' &&
        !isNaN(filters.maxCost) &&
        filters.maxCost > 0 &&
        typeof opt.totalCostInr === 'number' &&
        opt.totalCostInr > filters.maxCost
      ) {
        return false;
      }
      if (
        typeof filters.maxDurationMinutes === 'number' &&
        !isNaN(filters.maxDurationMinutes) &&
        filters.maxDurationMinutes > 0 &&
        typeof opt.durationMinutes === 'number' &&
        opt.durationMinutes > filters.maxDurationMinutes
      ) {
        return false;
      }
      if (filters.departureTimeOfDay && filters.departureTimeOfDay !== 'ALL') {
        const timeStr = (opt.departureTime || '').toUpperCase();
        const isPM = timeStr.includes('PM');
        const parts = timeStr.split(':');
        let hour = parseInt(parts[0], 10);
        if (isNaN(hour)) return true; // Do not silently exclude if time string format varies
        if (isPM && hour < 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;

        if (filters.departureTimeOfDay === 'MORNING' && (hour < 6 || hour >= 12)) return false;
        if (filters.departureTimeOfDay === 'AFTERNOON' && (hour < 12 || hour >= 17)) return false;
        if (filters.departureTimeOfDay === 'EVENING' && (hour < 17 || hour >= 21)) return false;
        if (filters.departureTimeOfDay === 'NIGHT' && (hour < 21 && hour >= 6)) return false;
      }

      return true;
    });
  }
}
