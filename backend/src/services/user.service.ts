import { prisma } from '../config/database.js';
import { AppError } from '../errors/AppError.js';
import { UserProfile, UserTravelPreferences, SavedTrip, SearchHistoryItem } from '@safar-saarthi/shared';

export class UserService {
  /**
   * Retrieves profile and travel preferences for a user.
   */
  static async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.notFound(`User with ID '${userId}' not found`);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      preferences: (user.preferences as any) || {},
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Updates travel preferences (budget, pace, dietary, preferred modes, favorite destinations).
   */
  static async updatePreferences(userId: string, preferences: UserTravelPreferences): Promise<UserProfile> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw AppError.notFound(`User with ID '${userId}' not found`);
    }

    const currentPrefs = (user.preferences as any) || {};
    const mergedPrefs = {
      ...currentPrefs,
      ...preferences,
    };

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: mergedPrefs,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as any,
      preferences: updated.preferences as any,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Retrieves all saved trips for the authenticated user.
   */
  static async getSavedTrips(userId: string): Promise<SavedTrip[]> {
    const saved = await prisma.savedTrip.findMany({
      where: { userId },
      include: {
        trip: {
          include: {
            transportOffers: { take: 1 },
          },
        },
      },
      orderBy: { savedAt: 'desc' },
    });

    return saved.map((s) => ({
      id: s.id,
      userId: s.userId || undefined,
      tripId: s.tripId,
      title: s.title || s.trip.destination,
      origin: s.trip.origin,
      destination: s.trip.destination,
      departureDate: s.trip.departureDate.toISOString().split('T')[0],
      returnDate: s.trip.returnDate ? s.trip.returnDate.toISOString().split('T')[0] : undefined,
      travelers: s.trip.travelers,
      estimatedTotalInr: s.trip.totalBudget ? Number(s.trip.totalBudget) : 0,
      transportMode: (s.trip.transportOffers[0]?.mode as any) || 'TRAIN',
      notes: s.notes || undefined,
      createdAt: s.trip.createdAt.toISOString(),
      savedAt: s.savedAt.toISOString(),
    }));
  }

  /**
   * Saves a trip for the authenticated user, enforcing ownership.
   */
  static async saveTrip(userId: string, tripId: string, title?: string, notes?: string): Promise<SavedTrip> {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { transportOffers: { take: 1 } },
    });

    if (!trip) {
      throw AppError.notFound(`Trip with ID '${tripId}' not found`);
    }

    // Check if already saved
    const existing = await prisma.savedTrip.findFirst({
      where: { userId, tripId },
    });

    if (existing) {
      return {
        id: existing.id,
        userId,
        tripId: existing.tripId,
        title: existing.title,
        origin: trip.origin,
        destination: trip.destination,
        departureDate: trip.departureDate.toISOString().split('T')[0],
        returnDate: trip.returnDate ? trip.returnDate.toISOString().split('T')[0] : undefined,
        travelers: trip.travelers,
        estimatedTotalInr: trip.totalBudget ? Number(trip.totalBudget) : 0,
        transportMode: (trip.transportOffers[0]?.mode as any) || 'TRAIN',
        notes: existing.notes || undefined,
        createdAt: trip.createdAt.toISOString(),
        savedAt: existing.savedAt.toISOString(),
      };
    }

    const saved = await prisma.savedTrip.create({
      data: {
        userId,
        tripId,
        title: title || `${trip.destination} Journey`,
        notes,
      },
    });

    return {
      id: saved.id,
      userId,
      tripId: saved.tripId,
      title: saved.title,
      origin: trip.origin,
      destination: trip.destination,
      departureDate: trip.departureDate.toISOString().split('T')[0],
      returnDate: trip.returnDate ? trip.returnDate.toISOString().split('T')[0] : undefined,
      travelers: trip.travelers,
      estimatedTotalInr: trip.totalBudget ? Number(trip.totalBudget) : 0,
      transportMode: (trip.transportOffers[0]?.mode as any) || 'TRAIN',
      notes: saved.notes || undefined,
      createdAt: trip.createdAt.toISOString(),
      savedAt: saved.savedAt.toISOString(),
    };
  }

  /**
   * Duplicates an existing saved trip and its entire itinerary into a new personal copy.
   */
  static async duplicateSavedTrip(userId: string, savedTripId: string): Promise<SavedTrip> {
    const saved = await prisma.savedTrip.findUnique({
      where: { id: savedTripId },
      include: {
        trip: {
          include: {
            transportOffers: true,
            itineraryDays: {
              include: {
                activities: true,
              },
            },
          },
        },
      },
    });

    if (!saved) {
      throw AppError.notFound(`Saved trip '${savedTripId}' not found`);
    }

    if (saved.userId && saved.userId !== userId) {
      throw AppError.forbidden('You do not have permission to duplicate another user’s private trip');
    }

    const orig = saved.trip;

    // Create cloned Trip
    const newTrip = await prisma.trip.create({
      data: {
        userId,
        title: orig.title || `${orig.destination} Journey`,
        origin: orig.origin,
        destination: orig.destination,
        departureDate: orig.departureDate,
        returnDate: orig.returnDate,
        travelers: orig.travelers,
        totalBudget: orig.totalBudget,
        status: orig.status,
        transportOffers: {
          create: orig.transportOffers.map((to) => ({
            providerId: to.providerId,
            mode: to.mode,
            category: to.category,
            operator: to.operator,
            identifier: to.identifier,
            originHub: to.originHub,
            destinationHub: to.destinationHub,
            departureTime: to.departureTime,
            arrivalTime: to.arrivalTime,
            durationMinutes: to.durationMinutes,
            baseFare: to.baseFare,
            taxesAndFees: to.taxesAndFees,
            totalCost: to.totalCost,
            currency: to.currency,
            bookingUrl: to.bookingUrl,
          })),
        },
        itineraryDays: {
          create: orig.itineraryDays.map((day) => ({
            dayNumber: day.dayNumber,
            theme: day.theme,
            date: day.date,
            dailyBudgetEstimate: day.dailyBudgetEstimate,
            localTransportTip: day.localTransportTip,
            activities: {
              create: day.activities.map((act) => ({
                placeId: act.placeId,
                timeSlot: act.timeSlot,
                title: act.title,
                location: act.location,
                description: act.description,
                entryFee: act.entryFee,
                durationMinutes: act.durationMinutes,
                category: act.category,
                insiderTip: act.insiderTip,
                orderIndex: act.orderIndex,
              })),
            },
          })),
        },
      },
    });

    const clonedTitle = saved.title
      ? `Copy of ${saved.title}`
      : orig.title
        ? `${orig.title} (Customized)`
        : 'Customized Journey';

    // Save cloned trip
    const clonedSaved = await prisma.savedTrip.create({
      data: {
        userId,
        tripId: newTrip.id,
        title: clonedTitle,
        notes: saved.notes,
      },
    });

    return {
      id: clonedSaved.id,
      userId,
      tripId: newTrip.id,
      title: clonedSaved.title,
      origin: newTrip.origin,
      destination: newTrip.destination,
      departureDate: newTrip.departureDate.toISOString().split('T')[0],
      returnDate: newTrip.returnDate ? newTrip.returnDate.toISOString().split('T')[0] : undefined,
      travelers: newTrip.travelers,
      estimatedTotalInr: newTrip.totalBudget ? Number(newTrip.totalBudget) : 0,
      transportMode: (orig.transportOffers[0]?.mode as any) || 'TRAIN',
      notes: clonedSaved.notes || undefined,
      createdAt: newTrip.createdAt.toISOString(),
      savedAt: clonedSaved.savedAt.toISOString(),
    };
  }

  /**
   * Deletes a saved trip record, enforcing ownership.
   */
  static async deleteSavedTrip(userId: string, savedTripId: string): Promise<void> {
    const saved = await prisma.savedTrip.findUnique({
      where: { id: savedTripId },
    });

    if (!saved) {
      throw AppError.notFound(`Saved trip with ID '${savedTripId}' not found`);
    }

    if (saved.userId && saved.userId !== userId) {
      throw AppError.forbidden('You do not have permission to delete this saved trip');
    }

    await prisma.savedTrip.delete({
      where: { id: savedTripId },
    });
  }

  /**
   * Retrieves search history for the user.
   */
  static async getSearchHistory(userId: string): Promise<SearchHistoryItem[]> {
    const history = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { searchedAt: 'desc' },
      take: 20,
    });

    return history.map((h) => ({
      id: h.id,
      origin: h.origin,
      destination: h.destination,
      departureDate: h.departureDate.toISOString().split('T')[0],
      returnDate: h.returnDate ? h.returnDate.toISOString().split('T')[0] : undefined,
      travelers: h.travelers,
      budgetInr: h.budget ? Number(h.budget) : undefined,
      preferredModes: h.preferredModes as any,
      searchedAt: h.searchedAt.toISOString(),
    }));
  }

  /**
   * Records a user search query in history.
   */
  static async recordSearch(
    userId: string,
    data: {
      origin: string;
      destination: string;
      departureDate: string;
      returnDate?: string;
      travelers: number;
      budget?: number;
      preferredModes?: string[];
    }
  ): Promise<SearchHistoryItem> {
    const entry = await prisma.searchHistory.create({
      data: {
        userId,
        origin: data.origin.trim(),
        destination: data.destination.trim(),
        departureDate: new Date(data.departureDate),
        returnDate: data.returnDate ? new Date(data.returnDate) : undefined,
        travelers: data.travelers || 1,
        budget: data.budget,
        preferredModes: (data.preferredModes as any) || [],
      },
    });

    return {
      id: entry.id,
      origin: entry.origin,
      destination: entry.destination,
      departureDate: entry.departureDate.toISOString().split('T')[0],
      returnDate: entry.returnDate ? entry.returnDate.toISOString().split('T')[0] : undefined,
      travelers: entry.travelers,
      budgetInr: entry.budget ? Number(entry.budget) : undefined,
      preferredModes: entry.preferredModes as any,
      searchedAt: entry.searchedAt.toISOString(),
    };
  }

  /**
   * Deletes a search history item, enforcing ownership.
   */
  static async deleteSearchHistory(userId: string, searchId: string): Promise<void> {
    const entry = await prisma.searchHistory.findUnique({
      where: { id: searchId },
    });

    if (!entry) {
      throw AppError.notFound(`Search history entry '${searchId}' not found`);
    }

    if (entry.userId && entry.userId !== userId) {
      throw AppError.forbidden('You do not have permission to delete this search history');
    }

    await prisma.searchHistory.delete({
      where: { id: searchId },
    });
  }

  /**
   * Manages user favorite destinations.
   */
  static async getFavorites(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('User not found');
    const prefs = (user.preferences as any) || {};
    return prefs.favoriteDestinations || [];
  }

  static async addFavorite(userId: string, destination: string): Promise<string[]> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('User not found');

    const prefs = (user.preferences as any) || {};
    const favorites: string[] = prefs.favoriteDestinations || [];
    const cleanDest = destination.trim();

    if (!favorites.includes(cleanDest)) {
      favorites.push(cleanDest);
      await prisma.user.update({
        where: { id: userId },
        data: {
          preferences: {
            ...prefs,
            favoriteDestinations: favorites,
          },
        },
      });
    }

    return favorites;
  }

  static async removeFavorite(userId: string, destination: string): Promise<string[]> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('User not found');

    const prefs = (user.preferences as any) || {};
    const favorites: string[] = (prefs.favoriteDestinations || []).filter(
      (d: string) => d.toLowerCase() !== destination.toLowerCase().trim()
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...prefs,
          favoriteDestinations: favorites,
        },
      },
    });

    return favorites;
  }
}
