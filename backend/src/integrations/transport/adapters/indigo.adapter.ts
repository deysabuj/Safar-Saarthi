import { BaseTransportAdapter, BaseAdapterOptions } from './base.adapter.js';
import { FlightProvider, TransportQuery, NormalizedTransportOffer } from '../types.js';
import { AmadeusClient } from '../amadeus/client.js';
import { getNormalizedBenchmarkOffers } from '../benchmarkBridge.js';
import { Logger } from '../../../utils/logger.js';

export class IndigoFlightAdapter extends BaseTransportAdapter implements FlightProvider {
  readonly code = 'INDIGO';
  readonly name = 'IndiGo Airlines (InterGlobe Aviation)';
  readonly mode = 'FLIGHT' as const;

  constructor(options: BaseAdapterOptions = {}) {
    super(options);
  }

  protected async executeSearch(query: TransportQuery): Promise<NormalizedTransportOffer[]> {
    const originIata = AmadeusClient.extractIataCode(query.origin);
    const destIata = AmadeusClient.extractIataCode(query.destination);

    // Query centralized authentic flight demonstration benchmarks for IndiGo
    const benchmarkOffers = getNormalizedBenchmarkOffers('FLIGHT', query, 'INDIGO');
    if (benchmarkOffers.length > 0) {
      Logger.info(
        `IndiGo benchmark returned ${benchmarkOffers.length} offers for route ${originIata} -> ${destIata}.`,
        'INDIGO_ADAPTER'
      );
      return benchmarkOffers;
    }

    Logger.info(
      `IndiGo demonstration benchmark not available for route ${originIata} -> ${destIata}. Returning 0 offers.`,
      'INDIGO_ADAPTER'
    );
    return [];
  }
}
