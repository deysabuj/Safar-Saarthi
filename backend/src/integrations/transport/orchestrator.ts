import { ProviderRegistry, defaultProviderRegistry } from './registry.js';
import {
  TransportQuery,
  NormalizedTransportOffer,
  SearchAggregationResult,
  ProviderExecutionError,
} from './types.js';
import { OfferNormalizationService } from './normalizer.js';
import { ProviderError } from './errors.js';
import { AmadeusClient } from './amadeus/client.js';
import { RailwayClient } from './railway/client.js';
import { resolveLocation } from '@safar-saarthi/shared';
import { Logger } from '../../utils/logger.js';

export interface OrchestratorOptions {
  registry?: ProviderRegistry;
  globalTimeoutMs?: number;
}

export class TransportSearchOrchestrator {
  private registry: ProviderRegistry;
  private globalTimeoutMs: number;

  constructor(options: OrchestratorOptions = {}) {
    this.registry = options.registry ?? defaultProviderRegistry;
    this.globalTimeoutMs = options.globalTimeoutMs ?? 4000;
  }

  async search(query: TransportQuery, tripId?: string): Promise<SearchAggregationResult> {
    const startTime = Date.now();

    // 1. Determine active providers matching the requested modes
    let candidateProviders = query.preferredModes && query.preferredModes.length > 0
      ? this.registry.getByModes(query.preferredModes)
      : this.registry.getAllActive();

    if (candidateProviders.length === 0) {
      Logger.warn(
        `No active providers registered for search modes: ${query.preferredModes?.join(', ') || 'ALL'}`,
        'SEARCH_ORCHESTRATOR'
      );
    }

    const searchedCodes = candidateProviders.map((p) => p.code);
    const successfulCodes: string[] = [];
    const failedCodes: string[] = [];
    const errors: ProviderExecutionError[] = [];
    const rawOffers: NormalizedTransportOffer[] = [];

    // 2. Global timeout controller
    const globalAbortController = new AbortController();
    const globalTimeoutId = setTimeout(() => globalAbortController.abort(), this.globalTimeoutMs);

    // Merge external signal if passed
    if (query.signal) {
      query.signal.addEventListener('abort', () => globalAbortController.abort(), { once: true });
    }

    const scopedQuery: TransportQuery = {
      ...query,
      signal: globalAbortController.signal,
    };

    try {
      // 3. Concurrent provider execution with Promise.allSettled (fault isolation)
      const executionPromises = candidateProviders.map(async (provider) => {
        try {
          const providerOffers = await provider.search(scopedQuery);
          return { providerCode: provider.code, offers: providerOffers };
        } catch (err: unknown) {
          throw { providerCode: provider.code, error: err };
        }
      });

      const settledResults = await Promise.allSettled(executionPromises);

      for (const result of settledResults) {
        if (result.status === 'fulfilled') {
          successfulCodes.push(result.value.providerCode);
          rawOffers.push(...result.value.offers);
        } else {
          const failure = result.reason as { providerCode: string; error: unknown };
          const pCode = failure.providerCode;
          failedCodes.push(pCode);

          let message = 'Provider search failed';
          let isTransient = true;
          let statusCode: number | undefined;

          if (failure.error instanceof ProviderError) {
            message = failure.error.message;
            isTransient = failure.error.isTransient;
            statusCode = failure.error.statusCode;
          } else if (failure.error instanceof Error) {
            message = failure.error.message;
          }

          Logger.error(
            `Provider '${pCode}' failed during search: ${message}`,
            'SEARCH_ORCHESTRATOR'
          );

          errors.push({
            providerCode: pCode,
            message,
            isTransient,
            statusCode,
          });
        }
      }
    } finally {
      clearTimeout(globalTimeoutId);
    }

    // 4. Strict route validation: Filter out any offers that do not correspond to the requested destination
    const destTerm = query.destination.toLowerCase().trim();
    const destIata = AmadeusClient.extractIataCode(query.destination).toLowerCase();
    const destStation = RailwayClient.resolveStationCode(query.destination).toLowerCase();
    const resolvedDest = resolveLocation(query.destination);
    const resolvedIata = (resolvedDest?.airport.code || destIata).toLowerCase();
    const resolvedStation = (resolvedDest?.railway.code || destStation).toLowerCase();
    const resolvedName = (resolvedDest?.name || '').toLowerCase();

    const routeFilteredOffers = rawOffers.filter((offer) => {
      const offerDestHub = (offer.destination.hubCode || '').toLowerCase();
      const offerDestCity = (offer.destination.city || '').toLowerCase();
      const offerDestName = (offer.destination.hubName || '').toLowerCase();

      const matches =
        offerDestHub === destIata ||
        offerDestHub === destStation ||
        offerDestHub === resolvedIata ||
        offerDestHub === resolvedStation ||
        offerDestCity.includes(destTerm) ||
        destTerm.includes(offerDestCity) ||
        (resolvedName.length > 0 && (offerDestCity.includes(resolvedName) || offerDestName.includes(resolvedName))) ||
        offerDestName.includes(destTerm) ||
        (destIata.length === 3 && offerDestName.includes(destIata)) ||
        (resolvedIata.length === 3 && offerDestName.includes(resolvedIata));

      if (!matches) {
        Logger.warn(
          `Offer ${offer.id} destination (${offerDestHub} / ${offerDestCity}) does not match search query destination (${query.destination}). Rejected.`,
          'SEARCH_ORCHESTRATOR'
        );
      }
      return matches;
    });

    // 5. Deduplicate offers
    const { uniqueOffers, duplicateCount } = OfferNormalizationService.deduplicate(routeFilteredOffers);
    if (duplicateCount > 0) {
      Logger.info(`Deduplicated ${duplicateCount} transport offers`, 'SEARCH_ORCHESTRATOR');
    }

    // 6. Rank and assign comparative categories (CHEAPEST, FASTEST, BEST_VALUE)
    const rankedOffers = OfferNormalizationService.rankAndCategorize(uniqueOffers);

    // Find standout badges
    const cheapest = rankedOffers.find((o) => o.category === 'CHEAPEST');
    const fastest = rankedOffers.find((o) => o.category === 'FASTEST');
    const bestValue = rankedOffers.find((o) => o.category === 'BEST_VALUE');

    const executionTimeMs = Date.now() - startTime;

    return {
      tripId,
      offers: rankedOffers,
      errors,
      meta: {
        totalOffers: rankedOffers.length,
        searchedProviders: searchedCodes,
        successfulProviders: successfulCodes,
        failedProviders: failedCodes,
        cheapestOfferId: cheapest?.id,
        fastestOfferId: fastest?.id,
        bestValueOfferId: bestValue?.id,
        executionTimeMs,
      },
    };
  }
}
