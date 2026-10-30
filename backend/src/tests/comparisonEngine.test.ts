import { describe, it, expect } from 'vitest';
import {
  CurrencyConverter,
  CurrencyConversionError,
} from '../services/comparison/currencyConverter.js';
import {
  ConnectionValidator,
} from '../services/comparison/connectionValidator.js';
import {
  TotalCostCalculator,
} from '../services/comparison/totalCostCalculator.js';
import {
  SmartRankingEngine,
} from '../services/comparison/smartRankingEngine.js';
import { NormalizedTransportOffer } from '../integrations/transport/types.js';
import { JourneyLeg } from '@safar-saarthi/shared';

describe('Smart Transport Comparison Engine', () => {
  // Helper to construct normalized mock offers
  const createMockOffer = (overrides: Partial<NormalizedTransportOffer> = {}): NormalizedTransportOffer => {
    const id = overrides.id || `offer-${Math.random().toString(36).substring(7)}`;
    const mode = overrides.mode || 'FLIGHT';
    const operator = overrides.operator || 'Test Operator';
    const identifier = overrides.identifier || 'TEST-101';
    const depTime = overrides.origin?.timestamp || '2026-11-20T06:00:00+05:30';
    const arrTime = overrides.destination?.timestamp || '2026-11-20T08:15:00+05:30';
    const durationMinutes = overrides.durationMinutes ?? 135;
    const baseFare = overrides.price?.baseFare ?? 4000;
    const mandatoryTaxesAndFees = overrides.price?.mandatoryTaxesAndFees ?? 800;
    const ticketTotal = overrides.price?.ticketTotal ?? baseFare + mandatoryTaxesAndFees;

    return {
      id,
      naturalKey: `${mode}:${operator}:${identifier}:DEL:BOM:${depTime}`,
      providerCode: overrides.providerCode || 'AMADEUS',
      providerName: overrides.providerName || 'Amadeus GDS',
      mode,
      category: overrides.category || 'BEST_VALUE',
      operator,
      identifier,
      origin: {
        timestamp: depTime,
        timezone: 'Asia/Kolkata',
        hubCode: 'DEL',
        hubName: 'Indira Gandhi Intl T3 (DEL)',
        city: 'Delhi',
        ...overrides.origin,
      },
      destination: {
        timestamp: arrTime,
        timezone: 'Asia/Kolkata',
        hubCode: 'BOM',
        hubName: 'Chhatrapati Shivaji Maharaj T2 (BOM)',
        city: 'Mumbai',
        ...overrides.destination,
      },
      durationMinutes,
      price: {
        baseFare,
        mandatoryTaxesAndFees,
        ticketTotal,
        currency: overrides.price?.currency || 'INR',
        transferCostEstimate: overrides.price?.transferCostEstimate !== undefined
          ? overrides.price.transferCostEstimate
          : {
              firstMileInr: 450,
              lastMileInr: 350,
              isEstimate: true,
              notes: 'Local airport taxi transfer',
            },
        estimatedGrandTotal: ticketTotal + 450 + 350,
        ...overrides.price,
      },
      availability: {
        status: 'AVAILABLE',
        seatsRemaining: 9,
        seatClass: 'ECONOMY',
        ...overrides.availability,
      },
      booking: {
        url: 'https://example.com/book',
        isOfficialDeepLink: true,
        partnerName: operator,
        ...overrides.booking,
      },
      lastCheckedTimestamp: overrides.lastCheckedTimestamp || new Date().toISOString(),
      dataSource: {
        type: 'LIVE',
        isDemonstration: false,
        ...overrides.dataSource,
      },
      details: overrides.details,
    };
  };

  describe('1. Currency Conversion with Verified Timestamps', () => {
    it('should convert foreign currencies to INR with verified rates and timestamps', () => {
      const converter = new CurrencyConverter();

      // Convert EUR to INR (1 EUR = 91.25 INR)
      const eurResult = converter.convertToInr(100, 'EUR');
      expect(eurResult.amountInInr).toBe(9125);
      expect(eurResult.exchangeRate).toBe(91.25);
      expect(eurResult.rateTimestamp).toBeDefined();

      // Convert USD to INR (1 USD = 84.40 INR)
      const usdResult = converter.convertToInr(50, 'USD');
      expect(usdResult.amountInInr).toBe(4220);
      expect(usdResult.exchangeRate).toBe(84.40);

      // INR should remain unchanged with 1.0 rate
      const inrResult = converter.convertToInr(5000, 'INR');
      expect(inrResult.amountInInr).toBe(5000);
      expect(inrResult.exchangeRate).toBe(1.0);
    });

    it('should reject conversion of unknown currencies without exchange rates', () => {
      const converter = new CurrencyConverter();
      expect(() => converter.convertToInr(100, 'XYZ')).toThrow(CurrencyConversionError);
    });

    it('should reject stale exchange rates older than the maximum threshold', () => {
      const converter = new CurrencyConverter({ maxStalenessHours: 24 });
      // Register an old rate from 10 days ago
      converter.registerRate({
        currency: 'JPY',
        rateToInr: 0.55,
        timestamp: '2026-10-01T00:00:00Z',
        source: 'Historical Test',
      });

      expect(() => converter.convertToInr(1000, 'JPY', '2026-10-23T00:00:00Z')).toThrow(
        /stale/i
      );
    });
  });

  describe('2. Total-Cost Model & Missing Cost Detection', () => {
    it('should calculate itemized door-to-door cost and explain every component counted', () => {
      const offer = createMockOffer({
        price: {
          baseFare: 3500,
          mandatoryTaxesAndFees: 600,
          ticketTotal: 4100,
          currency: 'INR',
          transferCostEstimate: {
            firstMileInr: 400,
            lastMileInr: 300,
            isEstimate: true,
            notes: 'Airport cab transfers',
          },
          estimatedGrandTotal: 4800,
        },
      });

      const breakdown = TotalCostCalculator.calculate({
        offer,
        baggageFeeInr: 500,
      });

      expect(breakdown.baseFareInr).toBe(3500);
      expect(breakdown.mandatoryTaxesAndFeesInr).toBe(600);
      expect(breakdown.baggageFeesInr).toBe(500);
      expect(breakdown.firstMileTransferInr).toBe(400);
      expect(breakdown.lastMileTransferInr).toBe(300);
      expect(breakdown.totalJourneyCostInr).toBe(5300); // 3500 + 600 + 500 + 400 + 300
      expect(breakdown.hasMissingCostComponents).toBe(false);

      expect(breakdown.components.length).toBe(5);
      expect(breakdown.components.some((c: { category: string }) => c.category === 'BASE_FARE')).toBe(true);
      expect(breakdown.components.some((c: { category: string }) => c.category === 'BAGGAGE')).toBe(true);
      expect(breakdown.components.some((c: { category: string }) => c.category === 'FIRST_MILE')).toBe(true);
      expect(breakdown.components.some((c: { category: string }) => c.category === 'LAST_MILE')).toBe(true);
    });

    it('should detect and flag missing transfer costs without treating them as zero', () => {
      const offerWithoutTransfers = createMockOffer({
        price: {
          baseFare: 2000,
          mandatoryTaxesAndFees: 200,
          ticketTotal: 2200,
          currency: 'INR',
          transferCostEstimate: null, // Unknown transfer cost
          estimatedGrandTotal: 2200,
        },
      });

      const breakdown = TotalCostCalculator.calculate({ offer: offerWithoutTransfers });
      expect(breakdown.hasMissingCostComponents).toBe(true);
      expect(breakdown.missingCostComponents).toContain('Origin hub first-mile transfer estimate');
      expect(breakdown.missingCostComponents).toContain('Destination hub last-mile transfer estimate');
    });
  });

  describe('3. Multi-Leg Journeys & Connection Validation', () => {
    it('should validate viable multi-leg connections and include interchange transfer costs', () => {
      const legs: JourneyLeg[] = [
        {
          legOrder: 1,
          mode: 'FLIGHT',
          operator: 'IndiGo',
          identifier: '6E-101',
          originHub: 'DEL T3',
          destinationHub: 'BOM T2',
          departureTime: '2026-11-20T06:00:00+05:30',
          arrivalTime: '2026-11-20T08:15:00+05:30',
          durationMinutes: 135,
          baseFareInr: 3000,
          mandatoryFeesInr: 600,
        },
        {
          legOrder: 2,
          mode: 'FLIGHT',
          operator: 'Air India',
          identifier: 'AI-202',
          originHub: 'BOM T2',
          destinationHub: 'GOI',
          departureTime: '2026-11-20T10:00:00+05:30', // 105 mins layover
          arrivalTime: '2026-11-20T11:15:00+05:30',
          durationMinutes: 75,
          baseFareInr: 2500,
          mandatoryFeesInr: 500,
        },
      ];

      const validation = ConnectionValidator.validate(legs);
      expect(validation.isValid).toBe(true);
      expect(validation.connections.length).toBe(1);
      expect(validation.connections[0].layoverMinutes).toBe(105);
      expect(validation.connections[0].isValidConnection).toBe(true);

      // Cost calculation across multi-leg journey
      const cost = TotalCostCalculator.calculate({
        legs,
        connections: validation.connections,
      });

      expect(cost.baseFareInr).toBe(5500); // 3000 + 2500
      expect(cost.mandatoryTaxesAndFeesInr).toBe(1100); // 600 + 500
      expect(cost.totalJourneyCostInr).toBeGreaterThanOrEqual(6600);
    });

    it('should reject impossible connections where Leg 2 departs before Leg 1 arrives', () => {
      const invalidLegs: JourneyLeg[] = [
        {
          legOrder: 1,
          mode: 'TRAIN',
          operator: 'IRCTC',
          identifier: '12951',
          originHub: 'NDLS',
          destinationHub: 'CSMT',
          departureTime: '2026-11-20T16:00:00+05:30',
          arrivalTime: '2026-11-21T08:30:00+05:30',
          durationMinutes: 990,
          baseFareInr: 1800,
          mandatoryFeesInr: 150,
        },
        {
          legOrder: 2,
          mode: 'FLIGHT',
          operator: 'IndiGo',
          identifier: '6E-555',
          originHub: 'BOM',
          destinationHub: 'GOI',
          departureTime: '2026-11-21T07:00:00+05:30', // Departs 90 mins BEFORE train arrival!
          arrivalTime: '2026-11-21T08:10:00+05:30',
          durationMinutes: 70,
          baseFareInr: 2200,
          mandatoryFeesInr: 400,
        },
      ];

      const validation = ConnectionValidator.validate(invalidLegs);
      expect(validation.isValid).toBe(false);
      expect(validation.rejectionReason).toContain('Chronological violation');
    });

    it('should reject connections with insufficient transfer time below minimum safety buffer', () => {
      const tightLegs: JourneyLeg[] = [
        {
          legOrder: 1,
          mode: 'TRAIN',
          operator: 'IRCTC',
          identifier: '12015',
          originHub: 'NDLS',
          destinationHub: 'JP',
          departureTime: '2026-11-20T06:10:00+05:30',
          arrivalTime: '2026-11-20T10:40:00+05:30',
          durationMinutes: 270,
          baseFareInr: 700,
          mandatoryFeesInr: 100,
        },
        {
          legOrder: 2,
          mode: 'BUS',
          operator: 'Zingbus',
          identifier: 'ZB-88',
          originHub: 'Sindhi Camp Central Bus Stand', // Different hub from railway station!
          destinationHub: 'UDR',
          departureTime: '2026-11-20T11:10:00+05:30', // Only 30 mins to get off train & cross town to bus stand
          arrivalTime: '2026-11-20T17:00:00+05:30',
          durationMinutes: 350,
          baseFareInr: 600,
          mandatoryFeesInr: 50,
        },
      ];

      const validation = ConnectionValidator.validate(tightLegs);
      expect(validation.isValid).toBe(false);
      expect(validation.rejectionReason).toContain('Insufficient transfer time');
    });
  });

  describe('4. Deterministic Ranking Modes & Tie-Breakers', () => {
    it('should rank cheapest option by lowest verified total journey cost', () => {
      const train = createMockOffer({
        id: 'train-1',
        mode: 'TRAIN',
        price: {
          baseFare: 1000,
          mandatoryTaxesAndFees: 150,
          ticketTotal: 1150,
          currency: 'INR',
          transferCostEstimate: { firstMileInr: 100, lastMileInr: 100, isEstimate: true },
          estimatedGrandTotal: 1350,
        },
        durationMinutes: 240,
      });

      const bus = createMockOffer({
        id: 'bus-1',
        mode: 'BUS',
        price: {
          baseFare: 500,
          mandatoryTaxesAndFees: 50,
          ticketTotal: 550,
          currency: 'INR',
          transferCostEstimate: { firstMileInr: 80, lastMileInr: 60, isEstimate: true },
          estimatedGrandTotal: 690, // Cheapest total
        },
        durationMinutes: 330,
      });

      const flight = createMockOffer({
        id: 'flight-1',
        mode: 'FLIGHT',
        price: {
          baseFare: 4000,
          mandatoryTaxesAndFees: 800,
          ticketTotal: 4800,
          currency: 'INR',
          transferCostEstimate: { firstMileInr: 450, lastMileInr: 350, isEstimate: true },
          estimatedGrandTotal: 5600,
        },
        durationMinutes: 65,
      });

      const engine = new SmartRankingEngine();
      const ranked = engine.rank([train, bus, flight]);

      const cheapest = ranked.find((r) => r.category === 'CHEAPEST');
      expect(cheapest).toBeDefined();
      expect(cheapest!.id).toBe('bus-1');
      expect(cheapest!.totalCostInr).toBe(690);

      const fastest = ranked.find((r) => r.category === 'FASTEST');
      expect(fastest).toBeDefined();
      expect(fastest!.id).toBe('flight-1');
      expect(fastest!.durationMinutes).toBe(65);
    });

    it('should not allow incomplete offers with missing costs to claim verified CHEAPEST', () => {
      // Incomplete offer with missing transfer costs showing deceptively low base fare
      const incompleteOffer = createMockOffer({
        id: 'incomplete-1',
        price: {
          baseFare: 400,
          mandatoryTaxesAndFees: 0,
          ticketTotal: 400,
          currency: 'INR',
          transferCostEstimate: null, // Missing transfers
          estimatedGrandTotal: 400,
        },
        durationMinutes: 400,
      });

      // Complete verified offer with slightly higher ticket fare but fully verified
      const verifiedOffer = createMockOffer({
        id: 'verified-1',
        price: {
          baseFare: 550,
          mandatoryTaxesAndFees: 50,
          ticketTotal: 600,
          currency: 'INR',
          transferCostEstimate: { firstMileInr: 80, lastMileInr: 60, isEstimate: true },
          estimatedGrandTotal: 740,
        },
        durationMinutes: 300,
      });

      const engine = new SmartRankingEngine();
      const ranked = engine.rank([incompleteOffer, verifiedOffer]);

      const cheapest = ranked.find((r) => r.category === 'CHEAPEST');
      expect(cheapest).toBeDefined();
      // Verified offer MUST be the one awarded CHEAPEST, not the incomplete estimate!
      expect(cheapest!.id).toBe('verified-1');
    });

    it('should break ties deterministically on equal prices using duration, availability, departure, and naturalKey', () => {
      const offerA = createMockOffer({
        id: 'offer-a',
        price: { baseFare: 1000, mandatoryTaxesAndFees: 0, ticketTotal: 1000, currency: 'INR', transferCostEstimate: { firstMileInr: 0, lastMileInr: 0, isEstimate: false }, estimatedGrandTotal: 1000 },
        durationMinutes: 120, // Faster
        origin: { timestamp: '2026-11-20T08:00:00+05:30', timezone: 'Asia/Kolkata', hubCode: 'DEL', hubName: 'DEL', city: 'Delhi' },
      });

      const offerB = createMockOffer({
        id: 'offer-b',
        price: { baseFare: 1000, mandatoryTaxesAndFees: 0, ticketTotal: 1000, currency: 'INR', transferCostEstimate: { firstMileInr: 0, lastMileInr: 0, isEstimate: false }, estimatedGrandTotal: 1000 },
        durationMinutes: 180, // Slower
        origin: { timestamp: '2026-11-20T08:00:00+05:30', timezone: 'Asia/Kolkata', hubCode: 'DEL', hubName: 'DEL', city: 'Delhi' },
      });

      const engine = new SmartRankingEngine();
      const ranked = engine.rank([offerB, offerA]); // Pass B before A

      // offerA should win cheapest due to faster duration tie-breaker
      const cheapest = ranked.find((r) => r.category === 'CHEAPEST');
      expect(cheapest!.id).toBe('offer-a');
    });

    it('should compute transparent trade-off metrics comparing options against cheapest and fastest', () => {
      const bus = createMockOffer({
        id: 'bus-1',
        price: { baseFare: 500, mandatoryTaxesAndFees: 0, ticketTotal: 500, currency: 'INR', transferCostEstimate: { firstMileInr: 0, lastMileInr: 0, isEstimate: false }, estimatedGrandTotal: 500 },
        durationMinutes: 300,
      });

      const flight = createMockOffer({
        id: 'flight-1',
        price: { baseFare: 3500, mandatoryTaxesAndFees: 0, ticketTotal: 3500, currency: 'INR', transferCostEstimate: { firstMileInr: 0, lastMileInr: 0, isEstimate: false }, estimatedGrandTotal: 3500 },
        durationMinutes: 60,
      });

      const engine = new SmartRankingEngine();
      const ranked = engine.rank([bus, flight]);

      const rankedFlight = ranked.find((r) => r.id === 'flight-1');
      expect(rankedFlight).toBeDefined();
      expect(rankedFlight!.tradeOffs.priceDiffFromCheapestInr).toBe(3000); // 3500 - 500
      expect(rankedFlight!.tradeOffs.durationDiffFromFastestMinutes).toBe(0);

      const rankedBus = ranked.find((r) => r.id === 'bus-1');
      expect(rankedBus).toBeDefined();
      expect(rankedBus!.tradeOffs.priceDiffFromCheapestInr).toBe(0);
      expect(rankedBus!.tradeOffs.durationDiffFromFastestMinutes).toBe(240); // 300 - 60
    });
  });

  describe('5. Stale Price Filtering', () => {
    it('should exclude stale offers older than maxStalenessHours by default', () => {
      const now = Date.now();
      const threeDaysAgoIso = new Date(now - 72 * 60 * 60 * 1000).toISOString();

      const freshOffer = createMockOffer({
        id: 'fresh-1',
        lastCheckedTimestamp: new Date().toISOString(),
      });

      const staleOffer = createMockOffer({
        id: 'stale-1',
        lastCheckedTimestamp: threeDaysAgoIso,
      });

      const engine = new SmartRankingEngine({ maxStalenessHours: 24 });
      const ranked = engine.rank([freshOffer, staleOffer]);

      expect(ranked.length).toBe(1);
      expect(ranked[0].id).toBe('fresh-1');
    });
  });
});
