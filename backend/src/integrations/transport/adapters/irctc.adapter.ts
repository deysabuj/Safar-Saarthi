import { BaseTransportAdapter, BaseAdapterOptions } from './base.adapter.js';
import {
  TrainProvider,
  TransportQuery,
  NormalizedTransportOffer,
  AvailabilityStatus,
} from '../types.js';
import { OfferNormalizationService } from '../normalizer.js';
import { RailwayClient } from '../railway/client.js';
import {
  RailwayTrainBetweenStationsResponse,
  RailwayTrainBetweenStationsItem,
} from '../railway/types.js';
import {
  RAW_IRCTC_RESPONSE,
  RAW_IRCTC_VARANASI_RESPONSE,
  RAW_IRCTC_KANPUR_RESPONSE,
} from '../fixtures/irctc.fixture.js';
import { getNormalizedBenchmarkOffers } from '../benchmarkBridge.js';
import { Logger } from '../../../utils/logger.js';

export interface IrctcAdapterOptions extends BaseAdapterOptions {
  client?: RailwayClient;
}

export class IrctcTrainAdapter extends BaseTransportAdapter implements TrainProvider {
  readonly code = 'IRCTC';
  readonly name = 'Indian Railway Catering and Tourism Corporation';
  readonly mode = 'TRAIN' as const;

  private client: RailwayClient;

  constructor(options: IrctcAdapterOptions = {}) {
    super(options);
    this.client = options.client || new RailwayClient();
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  getClient(): RailwayClient {
    return this.client;
  }

  protected async executeSearch(query: TransportQuery): Promise<NormalizedTransportOffer[]> {
    const fromStnCode = RailwayClient.resolveStationCode(query.origin);
    const toStnCode = RailwayClient.resolveStationCode(query.destination);
    const dateStr = query.departureDate;

    // 1. If configured with live Railway API key, query upstream API
    if (this.isConfigured()) {
      try {
        const liveResponse = await this.client.searchTrainsBetweenStations(
          {
            fromStationCode: fromStnCode,
            toStationCode: toStnCode,
            dateOfJourney: dateStr,
          },
          query.signal
        );

        if (!liveResponse.trainBtwnStnsList || !Array.isArray(liveResponse.trainBtwnStnsList) || liveResponse.trainBtwnStnsList.length === 0) {
          Logger.info(
            `Railway search returned 0 trains for corridor ${fromStnCode} -> ${toStnCode} on ${dateStr}`,
            'IRCTC_ADAPTER'
          );
          return [];
        }

        return this.normalizeRailwayResponse(liveResponse, query, fromStnCode, toStnCode, true);
      } catch (err: unknown) {
        Logger.error(
          `Railway live search error: ${err instanceof Error ? err.message : String(err)}`,
          'IRCTC_ADAPTER'
        );
        throw err;
      }
    }

    // 2. Unconfigured behavior:
    // Query centralized authentic Indian Railways timetable and fare structure benchmarks (clearly marked DEMO)
    const benchmarkOffers = getNormalizedBenchmarkOffers('TRAIN', query, 'IRCTC');
    if (benchmarkOffers.length > 0) {
      Logger.info(
        `IRCTC API unconfigured. Returning ${benchmarkOffers.length} authentic timetable benchmark offers for ${fromStnCode} -> ${toStnCode}.`,
        'IRCTC_ADAPTER'
      );
      return benchmarkOffers;
    }

    // Unsupported routes without configured live credentials: do NOT leak Jaipur or other routes
    Logger.info(
      `IRCTC is unconfigured and no benchmark exists for corridor ${fromStnCode} -> ${toStnCode}. Returning 0 offers. See docs/railway-bus-integration.md to activate.`,
      'IRCTC_ADAPTER'
    );
    return [];
  }

  /**
   * Normalizes raw Railway API response into NormalizedTransportOffer[]
   */
  normalizeRailwayResponse(
    response: RailwayTrainBetweenStationsResponse,
    query: TransportQuery,
    fromStnCode: string,
    toStnCode: string,
    isLive: boolean = true
  ): NormalizedTransportOffer[] {
    const offers: NormalizedTransportOffer[] = [];
    const dateStr = query.departureDate;

    for (const train of response.trainBtwnStnsList) {
      if (!train || !train.avlClasses || !Array.isArray(train.avlClasses) || !train.fares) {
        continue;
      }

      for (const classCode of train.avlClasses) {
        try {
          const offer = this.normalizeSingleTrainClass(train, classCode, query, dateStr, isLive);
          if (offer) {
            offers.push(OfferNormalizationService.validate(offer));
          }
        } catch (err: unknown) {
          Logger.warn(
            `Skipping unparsable train offer ${train.trainNumber} ${classCode}: ${err instanceof Error ? err.message : String(err)}`,
            'IRCTC_ADAPTER'
          );
        }
      }
    }

    return offers;
  }

  private normalizeSingleTrainClass(
    train: RailwayTrainBetweenStationsItem,
    classCode: string,
    query: TransportQuery,
    dateStr: string,
    isLive: boolean
  ): NormalizedTransportOffer | null {
    const fareInfo = train.fares[classCode];
    if (!fareInfo || typeof fareInfo.totalFare !== 'number') {
      return null;
    }

    // Parse departure and arrival timestamps with Indian standard timezone (+05:30)
    const depIso = `${dateStr}T${train.departureTime}:00+05:30`;

    // Check if arrival is next day (e.g. departs 19:55, arrives 00:30)
    let arrDateStr = dateStr;
    if (train.arrivalTime < train.departureTime) {
      const nextDay = new Date(dateStr);
      nextDay.setDate(nextDay.getDate() + 1);
      arrDateStr = nextDay.toISOString().split('T')[0];
    }
    const arrIso = `${arrDateStr}T${train.arrivalTime}:00+05:30`;

    // Availability status mapping per IRCTC rules
    let status: AvailabilityStatus = 'AVAILABLE';
    let seatsRemaining: number | null = fareInfo.seatsRemaining ?? null;

    if (fareInfo.availability.includes('WL')) {
      status = 'WAITLIST';
      seatsRemaining = null;
    } else if (fareInfo.availability.startsWith('RAC')) {
      status = 'RAC';
      seatsRemaining = null;
    } else if (fareInfo.availability === 'REGRET' || fareInfo.seatsRemaining === 0) {
      status = 'SOLD_OUT';
      seatsRemaining = 0;
    } else if (!isLive && !fareInfo.availability.startsWith('AVAILABLE')) {
      status = 'UNKNOWN';
    }

    const baseFare = fareInfo.baseFare;
    const mandatoryTaxesAndFees =
      (fareInfo.reservationCharge || 0) +
      (fareInfo.superfastCharge || 0) +
      (fareInfo.cateringCharge || 0);
    const ticketTotal = fareInfo.totalFare;

    const naturalKey = OfferNormalizationService.generateNaturalKey({
      mode: 'TRAIN',
      operator: 'Indian Railways (IRCTC)',
      identifier: `${train.trainNumber} ${train.trainName}`,
      originHub: train.fromStnCode,
      destinationHub: train.toStnCode,
      departureTimestamp: depIso,
      seatClass: classCode,
    });

    const bookingUrl = `https://www.irctc.co.in/nget/train-search?trainNo=${train.trainNumber}&date=${dateStr}&fromStn=${train.fromStnCode}&toStn=${train.toStnCode}`;

    return {
      id: `irctc-${train.trainNumber}-${classCode}-${dateStr}`,
      naturalKey,
      providerCode: this.code,
      providerName: this.name,
      mode: 'TRAIN',
      category: 'BEST_VALUE',
      operator: 'Indian Railways (IRCTC)',
      identifier: `${train.trainNumber} - ${train.trainName}`,
      origin: {
        timestamp: depIso,
        timezone: 'Asia/Kolkata',
        hubCode: train.fromStnCode,
        hubName: `${train.fromStationName} (${train.fromStnCode})`,
        city: query.origin,
      },
      destination: {
        timestamp: arrIso,
        timezone: 'Asia/Kolkata',
        hubCode: train.toStnCode,
        hubName: `${train.toStationName} (${train.toStnCode})`,
        city: query.destination,
      },
      durationMinutes: train.durationMinutes,
      price: {
        baseFare,
        mandatoryTaxesAndFees,
        ticketTotal,
        currency: 'INR',
        transferCostEstimate: {
          firstMileInr: 150,
          lastMileInr: 120,
          isEstimate: true,
          notes: 'Station auto/metro transfer to city centre',
        },
        estimatedGrandTotal: ticketTotal + 150 + 120,
      },
      availability: {
        status,
        seatsRemaining,
        seatClass: classCode,
        quota: 'GN',
      },
      booking: {
        url: bookingUrl,
        isOfficialDeepLink: true,
        partnerName: 'IRCTC e-Ticketing',
      },
      lastCheckedTimestamp: new Date().toISOString(),
      dataSource: {
        type: isLive ? 'LIVE' : 'DEMO',
        isDemonstration: !isLive,
        attributionNotes: isLive
          ? 'Live Indian Railways reservation data via authorized gateway.'
          : 'Indian Railways timetable and fare structure benchmark. Configure IRCTC_API_KEY for live availability.',
      },
      details: {
        train: {
          trainNumber: train.trainNumber,
          trainName: train.trainName,
          seatClassCode: classCode,
          tatkalQuotaAvailable: true,
          pantryCarAvailable: train.trainName.includes('VANDE') || train.trainName.includes('SHATABDI') || train.trainName.includes('RAJDHANI'),
        },
      },
    };
  }
}
