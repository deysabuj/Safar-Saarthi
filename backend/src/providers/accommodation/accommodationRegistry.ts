import { IAccommodationProvider, AccommodationSearchParams, NormalizedAccommodationOffer } from './types.js';
import { AmadeusAccommodationProvider } from './amadeusAccommodationProvider.js';
import { CuratedAccommodationProvider } from './curatedAccommodationProvider.js';
import { Logger } from '../../utils/logger.js';

export class AccommodationRegistry {
  private static instance: AccommodationRegistry;
  private providers: IAccommodationProvider[] = [];

  private constructor() {
    // 1. Amadeus authorized live API provider
    this.providers.push(new AmadeusAccommodationProvider());
    // 2. Curated verified Indian stays fallback provider
    this.providers.push(new CuratedAccommodationProvider());
  }

  public static getInstance(): AccommodationRegistry {
    if (!AccommodationRegistry.instance) {
      AccommodationRegistry.instance = new AccommodationRegistry();
    }
    return AccommodationRegistry.instance;
  }

  public registerProvider(provider: IAccommodationProvider): void {
    this.providers.unshift(provider);
  }

  public async search(params: AccommodationSearchParams): Promise<NormalizedAccommodationOffer[]> {
    for (const provider of this.providers) {
      try {
        const results = await provider.search(params);
        if (results && results.length > 0) {
          Logger.info(`[AccommodationRegistry] Found ${results.length} offers from ${provider.providerName}`);
          return results;
        }
      } catch (err: any) {
        Logger.warn(`[AccommodationRegistry] Provider ${provider.providerName} failed: ${err.message}`);
      }
    }

    return [];
  }
}
