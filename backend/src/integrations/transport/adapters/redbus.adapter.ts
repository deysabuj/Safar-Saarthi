import { BaseTransportAdapter, BaseAdapterOptions } from './base.adapter.js';
import {
  BusProvider,
  TransportQuery,
  NormalizedTransportOffer,
  AvailabilityStatus,
} from '../types.js';
import { OfferNormalizationService } from '../normalizer.js';
import { RedBusClient } from '../bus/client.js';
import {
  RedBusAvailableTripsResponse,
  RedBusAvailableBusItem,
} from '../bus/types.js';
import {
  RAW_REDBUS_RESPONSE,
  RAW_REDBUS_VARANASI_RESPONSE,
  RAW_REDBUS_KANPUR_RESPONSE,
} from '../fixtures/redbus.fixture.js';
import { getNormalizedBenchmarkOffers } from '../benchmarkBridge.js';
import { Logger } from '../../../utils/logger.js';

export interface RedBusAdapterOptions extends BaseAdapterOptions {
  client?: RedBusClient;
}

export class RedBusAdapter extends BaseTransportAdapter implements BusProvider {
  readonly code = 'REDBUS';
  readonly name = 'RedBus India Intercity Network';
  readonly mode = 'BUS' as const;

  private client: RedBusClient;

  constructor(options: RedBusAdapterOptions = {}) {
    super(options);
    this.client = options.client || new RedBusClient();
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  getClient(): RedBusClient {
    return this.client;
  }

  protected async executeSearch(query: TransportQuery): Promise<NormalizedTransportOffer[]> {
    const source = RedBusClient.resolveCity(query.origin);
    const destination = RedBusClient.resolveCity(query.destination);
    const dateStr = query.departureDate;

    // 1. If configured with live RedBus API key, query upstream API
    if (this.isConfigured()) {
      try {
        const liveResponse = await this.client.searchAvailableBuses(
          {
            sourceCity: source.name,
            destinationCity: destination.name,
            doj: dateStr,
          },
          query.signal
        );

        if (!liveResponse.availableBuses || !Array.isArray(liveResponse.availableBuses) || liveResponse.availableBuses.length === 0) {
          Logger.info(
            `RedBus search returned 0 buses for corridor ${source.name} -> ${destination.name} on ${dateStr}`,
            'REDBUS_ADAPTER'
          );
          return [];
        }

        return this.normalizeRedBusResponse(liveResponse, query, true);
      } catch (err: unknown) {
        Logger.error(
          `RedBus live search error: ${err instanceof Error ? err.message : String(err)}`,
          'REDBUS_ADAPTER'
        );
        throw err;
      }
    }

    // 2. Unconfigured behavior:
    // Query centralized authentic intercity bus network benchmarks (clearly marked DEMO)
    const benchmarkOffers = getNormalizedBenchmarkOffers('BUS', query, 'REDBUS');
    if (benchmarkOffers.length > 0) {
      Logger.info(
        `RedBus API unconfigured. Returning ${benchmarkOffers.length} authentic bus network benchmark offers for ${source.name} -> ${destination.name}.`,
        'REDBUS_ADAPTER'
      );
      return benchmarkOffers;
    }

    // Unsupported routes without configured live credentials: do NOT leak Jaipur or other routes
    Logger.info(
      `RedBus is unconfigured and no benchmark exists for corridor ${source.name} -> ${destination.name}. Returning 0 offers. See docs/railway-bus-integration.md to activate.`,
      'REDBUS_ADAPTER'
    );
    return [];
  }

  /**
   * Normalizes raw RedBus API response into NormalizedTransportOffer[]
   */
  normalizeRedBusResponse(
    response: RedBusAvailableTripsResponse,
    query: TransportQuery,
    isLive: boolean = true
  ): NormalizedTransportOffer[] {
    const offers: NormalizedTransportOffer[] = [];
    const dateStr = query.departureDate;

    for (const bus of response.availableBuses) {
      if (!bus || !bus.departure || !bus.arrival || !bus.pricing) {
        continue;
      }

      try {
        const offer = this.normalizeSingleBus(bus, query, dateStr, isLive);
        if (offer) {
          offers.push(OfferNormalizationService.validate(offer));
        }
      } catch (err: unknown) {
        Logger.warn(
          `Skipping unparsable bus offer ${bus.serviceId}: ${err instanceof Error ? err.message : String(err)}`,
          'REDBUS_ADAPTER'
        );
      }
    }

    return offers;
  }

  private normalizeSingleBus(
    bus: RedBusAvailableBusItem,
    query: TransportQuery,
    dateStr: string,
    isLive: boolean
  ): NormalizedTransportOffer | null {
    if (typeof bus.pricing.totalPayable !== 'number' || bus.pricing.totalPayable <= 0) {
      return null;
    }

    const depIso = `${dateStr}T${bus.departure.time}:00+05:30`;

    let arrDateStr = dateStr;
    if (bus.arrival.isNextDay || bus.arrival.time < bus.departure.time) {
      const nextDay = new Date(dateStr);
      nextDay.setDate(nextDay.getDate() + 1);
      arrDateStr = nextDay.toISOString().split('T')[0];
    }
    const arrIso = `${arrDateStr}T${bus.arrival.time}:00+05:30`;

    const status: AvailabilityStatus =
      bus.availableSeatsCount > 0 ? 'AVAILABLE' : bus.availableSeatsCount === 0 ? 'SOLD_OUT' : 'UNKNOWN';

    const naturalKey = OfferNormalizationService.generateNaturalKey({
      mode: 'BUS',
      operator: bus.operatorName,
      identifier: bus.serviceId,
      originHub: bus.departure.hubCode,
      destinationHub: bus.arrival.hubCode,
      departureTimestamp: depIso,
      seatClass: bus.busType,
    });

    const bookingUrl = bus.bookingDeepLink || `https://www.redbus.in/bus-tickets/${encodeURIComponent(query.origin)}-to-${encodeURIComponent(query.destination)}?doj=${dateStr}`;

    return {
      id: `rb-${bus.serviceId}-${dateStr}`,
      naturalKey,
      providerCode: this.code,
      providerName: this.name,
      mode: 'BUS',
      category: 'CHEAPEST',
      operator: bus.operatorName,
      identifier: `${bus.operatorName} - ${bus.busType}`,
      origin: {
        timestamp: depIso,
        timezone: 'Asia/Kolkata',
        hubCode: bus.departure.hubCode,
        hubName: bus.departure.location,
        city: query.origin,
      },
      destination: {
        timestamp: arrIso,
        timezone: 'Asia/Kolkata',
        hubCode: bus.arrival.hubCode,
        hubName: bus.arrival.location,
        city: query.destination,
      },
      durationMinutes: bus.totalDurationMinutes,
      price: {
        baseFare: bus.pricing.baseFare,
        mandatoryTaxesAndFees: bus.pricing.gstAndOperatorFee,
        ticketTotal: bus.pricing.totalPayable,
        currency: 'INR',
        transferCostEstimate: {
          firstMileInr: 80,
          lastMileInr: 60,
          isEstimate: true,
          notes: 'City auto/rickshaw transfer to highway boarding point',
        },
        estimatedGrandTotal: bus.pricing.totalPayable + 80 + 60,
      },
      availability: {
        status,
        seatsRemaining: bus.availableSeatsCount,
        seatClass: bus.busType,
      },
      booking: {
        url: bookingUrl,
        isOfficialDeepLink: true,
        partnerName: bus.operatorName,
      },
      lastCheckedTimestamp: new Date().toISOString(),
      dataSource: {
        type: isLive ? 'LIVE' : 'DEMO',
        isDemonstration: !isLive,
        attributionNotes: isLive
          ? 'Live intercity bus inventory via RedBus Network.'
          : 'Intercity bus aggregator schedule benchmark. Configure REDBUS_API_KEY for live inventory.',
      },
      details: {
        bus: {
          busType: bus.busType,
          operatorName: bus.operatorName,
          hasChargingPoint: bus.hasCharging,
          isSleeper: bus.isSleeper,
          boardingPoint: bus.departure.location,
          droppingPoint: bus.arrival.location,
        },
      },
    };
  }
}
