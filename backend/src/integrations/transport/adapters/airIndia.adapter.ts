import { BaseTransportAdapter, BaseAdapterOptions } from './base.adapter.js';
import { FlightProvider, TransportQuery, NormalizedTransportOffer } from '../types.js';
import { AmadeusClient } from '../amadeus/client.js';
import { getNormalizedBenchmarkOffers } from '../benchmarkBridge.js';
import { Logger } from '../../../utils/logger.js';

export class AirIndiaFlightAdapter extends BaseTransportAdapter implements FlightProvider {
  readonly code = 'AIR_INDIA';
  readonly name = 'Air India Limited';
  readonly mode = 'FLIGHT' as const;

  constructor(options: BaseAdapterOptions = {}) {
    super(options);
  }

  protected async executeSearch(query: TransportQuery): Promise<NormalizedTransportOffer[]> {
    const originIata = AmadeusClient.extractIataCode(query.origin);
    const destIata = AmadeusClient.extractIataCode(query.destination);

    // Query centralized authentic flight demonstration benchmarks for Air India
    const benchmarkOffers = getNormalizedBenchmarkOffers('FLIGHT', query, 'AIR_INDIA');
    if (benchmarkOffers.length > 0) {
      Logger.info(
        `Air India benchmark returned ${benchmarkOffers.length} offers for route ${originIata} -> ${destIata}.`,
        'AIR_INDIA_ADAPTER'
      );
      return benchmarkOffers;
    }

    Logger.info(
      `Air India demonstration benchmark not available for route ${originIata} -> ${destIata}. Returning 0 offers.`,
      'AIR_INDIA_ADAPTER'
    );
    return [];
  }
}
