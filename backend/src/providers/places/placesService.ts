import { CuratedPlacesProvider } from './curatedPlacesProvider.js';
import { PlaceItem } from './types.js';
import { ActivityCategory } from '@safar-saarthi/shared';
import { prisma } from '../../config/database.js';

export class PlacesService {
  private static curatedProvider = new CuratedPlacesProvider();

  /**
   * Retrieves verified destination places, falling back gracefully if DB is unavailable.
   */
  static async getPlacesForDestination(
    destination: string,
    category?: ActivityCategory
  ): Promise<PlaceItem[]> {
    // 1. First retrieve verified places with complete coordinates and operating hours
    const curated = await PlacesService.curatedProvider.getPlaces(destination, category);

    // 2. Safely try database places if available
    try {
      const cleanDest = destination.split('(')[0].trim();
      const dbPlaces = await prisma.place.findMany({
        where: {
          destination: { contains: cleanDest, mode: 'insensitive' },
          ...(category ? { category: category as any } : {}),
        },
      }).catch(() => null);

      if (dbPlaces && dbPlaces.length > 0) {
        // Merge DB places without overriding verified curated coordinates
        const dbItems: PlaceItem[] = dbPlaces.map((p) => ({
          id: p.id,
          destination: p.destination,
          title: p.title,
          location: p.location,
          address: p.location,
          category: p.category as ActivityCategory,
          description: p.description,
          entryFeeInr: Number(p.entryFee),
          currency: p.currency,
          typicalDurationMinutes: p.typicalDurationMinutes,
          insiderTip: p.insiderTip || undefined,
          bestTimeToVisit: p.bestTimeToVisit || undefined,
          latitude: p.latitude ? Number(p.latitude) : 26.9124,
          longitude: p.longitude ? Number(p.longitude) : 75.7873,
          requiresConfirmation: !p.latitude,
          confirmationNote: !p.latitude ? 'Exact coordinates unverified; verify address locally.' : undefined,
        }));

        // Return deduplicated list by title
        const seen = new Set<string>();
        const combined: PlaceItem[] = [];

        for (const item of [...curated, ...dbItems]) {
          const key = item.title.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(item);
          }
        }
        return combined;
      }
    } catch {
      // Database unavailable: graceful degradation without throwing
    }

    return curated;
  }

  static async getPlaceById(id: string): Promise<PlaceItem | null> {
    const curated = await PlacesService.curatedProvider.getPlaceById(id);
    if (curated) return curated;

    try {
      const dbPlace = await prisma.place.findUnique({ where: { id } });
      if (!dbPlace) return null;

      return {
        id: dbPlace.id,
        destination: dbPlace.destination,
        title: dbPlace.title,
        location: dbPlace.location,
        address: dbPlace.location,
        category: dbPlace.category as ActivityCategory,
        description: dbPlace.description,
        entryFeeInr: Number(dbPlace.entryFee),
        currency: dbPlace.currency,
        typicalDurationMinutes: dbPlace.typicalDurationMinutes,
        insiderTip: dbPlace.insiderTip || undefined,
        bestTimeToVisit: dbPlace.bestTimeToVisit || undefined,
        latitude: dbPlace.latitude ? Number(dbPlace.latitude) : 26.9124,
        longitude: dbPlace.longitude ? Number(dbPlace.longitude) : 75.7873,
      };
    } catch {
      return null;
    }
  }
}
