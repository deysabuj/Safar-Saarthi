import {
  RankedJourneyOption,
  TransportOption,
  DataQualityRating,
  JourneyTradeOffs,
  TransportCategory,
  BookingProvider,
} from '@safar-saarthi/shared';
import { NormalizedTransportOffer } from '../../integrations/transport/types.js';
import { TotalCostCalculator } from './totalCostCalculator.js';
import { ConnectionValidator } from './connectionValidator.js';
import { defaultCurrencyConverter, CurrencyConverter } from './currencyConverter.js';
import { Logger } from '../../utils/logger.js';

export interface RankingEngineOptions {
  currencyConverter?: CurrencyConverter;
  maxStalenessHours?: number;
  costWeight?: number;
  timeWeight?: number;
  interchangeWeight?: number;
}

export class SmartRankingEngine {
  private converter: CurrencyConverter;
  private maxStalenessHours: number;
  private costWeight: number;
  private timeWeight: number;
  private interchangeWeight: number;

  constructor(options: RankingEngineOptions = {}) {
    this.converter = options.currencyConverter || defaultCurrencyConverter;
    this.maxStalenessHours = options.maxStalenessHours ?? 48;
    this.costWeight = options.costWeight ?? 0.6;
    this.timeWeight = options.timeWeight ?? 3.5;
    this.interchangeWeight = options.interchangeWeight ?? 250;
  }

  /**
   * Assesses the data quality rating of an offer
   */
  static evaluateDataQuality(offer: NormalizedTransportOffer, hasMissingCosts: boolean): DataQualityRating {
    if (hasMissingCosts) {
      return 'INCOMPLETE';
    }

    if (offer.dataSource.type === 'DEMO' || offer.dataSource.isDemonstration) {
      return 'ESTIMATED';
    }

    if (offer.dataSource.type === 'CACHED') {
      return 'CACHED';
    }

    // Live data
    if (offer.dataSource.type === 'LIVE') {
      if (offer.availability.status === 'AVAILABLE' && offer.availability.seatsRemaining !== null) {
        return 'VERIFIED_COMPLETE';
      }
      return 'VERIFIED_PARTIAL';
    }

    return 'ESTIMATED';
  }

  /**
   * Evaluates convenience score (1 to 10)
   */
  static calculateConvenienceRating(offer: NormalizedTransportOffer): number {
    let rating = 8; // base

    if (offer.mode === 'FLIGHT') {
      const stops = offer.details?.flight?.stops ?? 0;
      rating = stops === 0 ? 9 : Math.max(5, 8 - stops * 2);
    } else if (offer.mode === 'TRAIN') {
      if (offer.identifier.includes('VANDE') || offer.identifier.includes('SHATABDI')) {
        rating = 9;
      } else if (offer.availability.status === 'WAITLIST') {
        rating = 4;
      } else {
        rating = 7;
      }
    } else if (offer.mode === 'BUS') {
      if (offer.details?.bus?.isSleeper) {
        rating = 7;
      } else {
        rating = 5;
      }
    }

    if (offer.availability.status === 'SOLD_OUT') {
      rating = 1;
    }

    return rating;
  }

  /**
   * Checks if an offer price is stale
   */
  isOfferStale(offer: NormalizedTransportOffer, nowMs: number = Date.now()): boolean {
    const checkedTime = new Date(offer.lastCheckedTimestamp).getTime();
    if (isNaN(checkedTime)) return false;
    const diffHours = (nowMs - checkedTime) / (1000 * 60 * 60);
    return diffHours > this.maxStalenessHours;
  }

  /**
   * Ranks and compares a list of transport offers deterministically.
   */
  rank(offers: NormalizedTransportOffer[], options: { includeStale?: boolean } = {}): RankedJourneyOption[] {
    if (!offers || offers.length === 0) {
      return [];
    }

    const nowMs = Date.now();

    // 1. Filter stale offers if requested
    const validOffers = options.includeStale
      ? offers
      : offers.filter((o) => !this.isOfferStale(o, nowMs));

    if (validOffers.length === 0) {
      Logger.warn('All candidate offers were filtered out due to staleness', 'SMART_RANKING');
      return [];
    }

    // 2. Compute itemized cost breakdowns and quality ratings
    const evaluated: {
      raw: NormalizedTransportOffer;
      itemizedCost: ReturnType<typeof TotalCostCalculator.calculate>;
      dataQuality: DataQualityRating;
      convenience: number;
      valueScore: number;
    }[] = [];

    for (const raw of validOffers) {
      const itemizedCost = TotalCostCalculator.calculate({
        offer: raw,
        currencyConverter: this.converter,
      });

      const dataQuality = SmartRankingEngine.evaluateDataQuality(raw, itemizedCost.hasMissingCostComponents);
      const convenience = SmartRankingEngine.calculateConvenienceRating(raw);

      // Value score (lower is better)
      let penalty = 0;
      if (raw.availability.status === 'WAITLIST') penalty += 350;
      if (raw.availability.status === 'UNKNOWN') penalty += 150;
      if (raw.availability.status === 'SOLD_OUT') penalty += 2000;
      if (dataQuality === 'INCOMPLETE') penalty += 500;
      if (raw.mode === 'BUS' && !raw.details?.bus?.isSleeper && raw.durationMinutes > 360) penalty += 400;

      const valueScore =
        itemizedCost.totalJourneyCostInr * this.costWeight +
        raw.durationMinutes * this.timeWeight +
        penalty;

      evaluated.push({
        raw,
        itemizedCost,
        dataQuality,
        convenience,
        valueScore,
      });
    }

    // 3. Deterministic Winner Selection
    // A) Cheapest Winner:
    // Constraint: Incomplete offers cannot be designated as verified CHEAPEST if complete/verified offers exist.
    const completeCandidates = evaluated.filter((e) => e.dataQuality !== 'INCOMPLETE' && e.raw.availability.status !== 'SOLD_OUT');
    const cheapestPool = completeCandidates.length > 0 ? completeCandidates : evaluated;

    cheapestPool.sort((a, b) => {
      // 1. Total cost
      if (a.itemizedCost.totalJourneyCostInr !== b.itemizedCost.totalJourneyCostInr) {
        return a.itemizedCost.totalJourneyCostInr - b.itemizedCost.totalJourneyCostInr;
      }
      // 2. Duration
      if (a.raw.durationMinutes !== b.raw.durationMinutes) {
        return a.raw.durationMinutes - b.raw.durationMinutes;
      }
      // 3. Availability preference
      const statusWeight = (s: string) => (s === 'AVAILABLE' ? 1 : s === 'RAC' ? 2 : s === 'WAITLIST' ? 3 : 4);
      const diffStatus = statusWeight(a.raw.availability.status) - statusWeight(b.raw.availability.status);
      if (diffStatus !== 0) return diffStatus;
      // 4. Departure time
      const depDiff = a.raw.origin.timestamp.localeCompare(b.raw.origin.timestamp);
      if (depDiff !== 0) return depDiff;
      // 5. Deterministic tie-breaker on natural key
      return a.raw.naturalKey.localeCompare(b.raw.naturalKey);
    });

    const cheapestWinnerId = cheapestPool[0]?.raw.id;
    const lowestCost = cheapestPool[0]?.itemizedCost.totalJourneyCostInr ?? 0;

    // B) Fastest Winner:
    const availablePool = evaluated.filter((e) => e.raw.availability.status !== 'SOLD_OUT');
    const fastestPool = availablePool.length > 0 ? [...availablePool] : [...evaluated];

    fastestPool.sort((a, b) => {
      // 1. Duration
      if (a.raw.durationMinutes !== b.raw.durationMinutes) {
        return a.raw.durationMinutes - b.raw.durationMinutes;
      }
      // 2. Total cost
      if (a.itemizedCost.totalJourneyCostInr !== b.itemizedCost.totalJourneyCostInr) {
        return a.itemizedCost.totalJourneyCostInr - b.itemizedCost.totalJourneyCostInr;
      }
      // 3. Departure time
      const depDiff = a.raw.origin.timestamp.localeCompare(b.raw.origin.timestamp);
      if (depDiff !== 0) return depDiff;
      return a.raw.naturalKey.localeCompare(b.raw.naturalKey);
    });

    const fastestWinnerId = fastestPool[0]?.raw.id;
    const shortestDuration = fastestPool[0]?.raw.durationMinutes ?? 0;

    // C) Best Value Winner:
    const valuePool = [...availablePool];
    valuePool.sort((a, b) => {
      if (a.valueScore !== b.valueScore) {
        return a.valueScore - b.valueScore;
      }
      return a.itemizedCost.totalJourneyCostInr - b.itemizedCost.totalJourneyCostInr;
    });

    const bestValueWinnerId = valuePool[0]?.raw.id ?? fastestWinnerId;

    // 4. Construct RankedJourneyOption[] with transparent trade-offs
    return evaluated.map(({ raw, itemizedCost, dataQuality, convenience, valueScore }) => {
      let category: TransportCategory = 'BEST_VALUE';

      if (raw.id === cheapestWinnerId) {
        category = 'CHEAPEST';
      } else if (raw.id === fastestWinnerId) {
        category = 'FASTEST';
      } else if (raw.id === bestValueWinnerId) {
        category = 'BEST_VALUE';
      }

      const priceDiff = Math.max(0, itemizedCost.totalJourneyCostInr - lowestCost);
      const durationDiff = Math.max(0, raw.durationMinutes - shortestDuration);

      let tradeOffSummary = '';
      if (raw.id === cheapestWinnerId) {
        tradeOffSummary = 'Lowest verified door-to-door cost across all modes.';
      } else if (raw.id === fastestWinnerId) {
        tradeOffSummary = `Shortest door-to-door travel time (${Math.floor(raw.durationMinutes / 60)}h ${raw.durationMinutes % 60}m). +₹${priceDiff.toLocaleString('en-IN')} vs cheapest.`;
      } else {
        const hoursSaved = Math.round((durationDiff / 60) * 10) / 10;
        tradeOffSummary = `Balanced value: ₹${itemizedCost.totalJourneyCostInr.toLocaleString('en-IN')} total, saves ${hoursSaved}h vs slowest options.`;
      }

      const tradeOffs: JourneyTradeOffs = {
        priceDiffFromCheapestInr: priceDiff,
        durationDiffFromFastestMinutes: durationDiff,
        convenienceRating: convenience,
        valueScore: Math.round(valueScore),
        tradeOffSummary,
      };

      const depTimeFormatted = new Date(raw.origin.timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const arrTimeFormatted = new Date(raw.destination.timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      return {
        id: raw.id,
        mode: raw.mode,
        category,
        operator: raw.operator,
        identifier: raw.identifier,
        departureTime: depTimeFormatted,
        arrivalTime: arrTimeFormatted,
        durationMinutes: raw.durationMinutes,
        originHub: raw.origin.hubName,
        destinationHub: raw.destination.hubName,
        baseFareInr: itemizedCost.baseFareInr,
        taxesAndFeesInr: itemizedCost.mandatoryTaxesAndFeesInr,
        totalCostInr: itemizedCost.totalJourneyCostInr,
        availableSeats: raw.availability.seatsRemaining ?? undefined,
        seatClass: raw.availability.seatClass ?? undefined,
        attribution: {
          provider: raw.providerCode as BookingProvider,
          displayName: raw.providerName,
          officialBookingUrl: raw.booking.url,
          lastCheckedTimestamp: raw.lastCheckedTimestamp,
          isDemonstrationData: raw.dataSource.isDemonstration,
          dataSource: raw.dataSource.type,
          notes: raw.dataSource.attributionNotes,
        },
        transferDetails: raw.price.transferCostEstimate
          ? {
              firstMileEstMinutes: 45,
              firstMileCostInr: raw.price.transferCostEstimate.firstMileInr ?? 0,
              lastMileEstMinutes: 35,
              lastMileCostInr: raw.price.transferCostEstimate.lastMileInr ?? 0,
              description: raw.price.transferCostEstimate.notes ?? 'Door-to-door transit transfer',
            }
          : undefined,
        itemizedCost,
        dataQuality,
        tradeOffs,
      };
    });
  }
}

export const defaultRankingEngine = new SmartRankingEngine();
