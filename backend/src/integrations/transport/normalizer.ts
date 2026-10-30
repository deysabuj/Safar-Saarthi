import { NormalizedTransportOffer, TransportCategory } from './types.js';
import { normalizedTransportOfferSchema } from './schemas.js';
import { ProviderValidationError } from './errors.js';
import { Logger } from '../../utils/logger.js';
import { defaultRankingEngine } from '../../services/comparison/smartRankingEngine.js';

export class OfferNormalizationService {
  /**
   * Generates a deterministic natural key for deduplication.
   */
  static generateNaturalKey(offer: {
    mode: string;
    operator: string;
    identifier: string;
    originHub: string;
    destinationHub: string;
    departureTimestamp: string;
    seatClass?: string | null;
  }): string {
    const parts = [
      offer.mode.toUpperCase(),
      offer.operator.trim().toUpperCase(),
      offer.identifier.trim().toUpperCase(),
      offer.seatClass ? offer.seatClass.trim().toUpperCase() : 'DEFAULT',
      offer.originHub.trim().toUpperCase(),
      offer.destinationHub.trim().toUpperCase(),
      offer.departureTimestamp.trim(),
    ];
    return parts.join(':');
  }

  /**
   * Validates a candidate offer against the strict normalized transport schema.
   */
  static validate(offer: NormalizedTransportOffer): NormalizedTransportOffer {
    const parsed = normalizedTransportOfferSchema.safeParse(offer);
    if (!parsed.success) {
      const issueSummary = parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ');
      Logger.warn(
        `Transport offer schema validation failed for ${offer.identifier}: ${issueSummary}`,
        'OFFER_NORMALIZATION'
      );
      throw new ProviderValidationError(offer.providerCode, issueSummary);
    }
    return parsed.data as NormalizedTransportOffer;
  }

  /**
   * Deduplicates offers preserving the most recently checked or lowest priced version.
   */
  static deduplicate(offers: NormalizedTransportOffer[]): {
    uniqueOffers: NormalizedTransportOffer[];
    duplicateCount: number;
  } {
    const seen = new Map<string, NormalizedTransportOffer>();
    let duplicateCount = 0;

    for (const offer of offers) {
      const key = offer.naturalKey;
      if (seen.has(key)) {
        duplicateCount++;
        const existing = seen.get(key)!;
        // Keep the lower price or newer lastCheckedTimestamp
        if (offer.price.ticketTotal < existing.price.ticketTotal) {
          seen.set(key, offer);
        }
      } else {
        seen.set(key, offer);
      }
    }

    return {
      uniqueOffers: Array.from(seen.values()),
      duplicateCount,
    };
  }

  /**
   * Calculates comparative categories (CHEAPEST, FASTEST, BEST_VALUE)
   * deterministically across a set of offers.
   */
  static rankAndCategorize(offers: NormalizedTransportOffer[]): NormalizedTransportOffer[] {
    if (offers.length === 0) return [];

    const ranked = defaultRankingEngine.rank(offers, { includeStale: true });
    const categoryMap = new Map<string, TransportCategory>();
    for (const r of ranked) {
      categoryMap.set(r.id, r.category);
    }

    return offers.map((offer) => ({
      ...offer,
      category: categoryMap.get(offer.id) || 'BEST_VALUE',
    }));
  }
}
