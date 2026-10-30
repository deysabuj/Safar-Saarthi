import { describe, it, expect, beforeEach } from 'vitest';
import {
  OfferNormalizationService,
  ProviderRegistry,
  TransportSearchOrchestrator,
  IrctcTrainAdapter,
  IndigoFlightAdapter,
  AirIndiaFlightAdapter,
  RedBusAdapter,
  NormalizedTransportOffer,
  TransportProvider,
  TransportQuery,
  ProviderError,
  ProviderTimeoutError,
} from '../integrations/transport/index.js';
import { normalizedTransportOfferSchema } from '../integrations/transport/schemas.js';

describe('Transport Integration Framework', () => {
  let registry: ProviderRegistry;
  let orchestrator: TransportSearchOrchestrator;

  const sampleQuery: TransportQuery = {
    origin: 'New Delhi (DEL)',
    destination: 'Jaipur (JAI)',
    departureDate: '2026-11-20',
    travelers: 2,
  };

  beforeEach(() => {
    registry = new ProviderRegistry();
    registry.register(new IrctcTrainAdapter());
    registry.register(new IndigoFlightAdapter());
    registry.register(new AirIndiaFlightAdapter());
    registry.register(new RedBusAdapter());

    orchestrator = new TransportSearchOrchestrator({ registry, globalTimeoutMs: 3000 });
  });

  // Acceptance Criterion 1: All transport modes share the same normalized offer contract
  it('should normalize flight, train, and bus responses into the exact same contract', async () => {
    const irctc = new IrctcTrainAdapter();
    const indigo = new IndigoFlightAdapter();
    const redbus = new RedBusAdapter();

    const [trainOffers, flightOffers, busOffers] = await Promise.all([
      irctc.search(sampleQuery),
      indigo.search(sampleQuery),
      redbus.search(sampleQuery),
    ]);

    expect(trainOffers.length).toBeGreaterThan(0);
    expect(flightOffers.length).toBeGreaterThan(0);
    expect(busOffers.length).toBeGreaterThan(0);

    const allOffers = [...trainOffers, ...flightOffers, ...busOffers];

    // Validate that EVERY offer from every mode conforms strictly to the Zod schema
    for (const offer of allOffers) {
      const validation = normalizedTransportOfferSchema.safeParse(offer);
      expect(validation.success).toBe(true);

      // Verify required fields
      expect(offer).toHaveProperty('id');
      expect(offer).toHaveProperty('naturalKey');
      expect(offer).toHaveProperty('providerCode');
      expect(offer).toHaveProperty('providerName');
      expect(offer).toHaveProperty('mode');
      expect(offer).toHaveProperty('operator');
      expect(offer).toHaveProperty('identifier');

      // TimePoint verification with timezone
      expect(offer.origin.timestamp).toMatch(/\+05:30$/);
      expect(offer.origin.timezone).toBe('Asia/Kolkata');
      expect(offer.destination.timestamp).toMatch(/\+05:30$/);

      // Price breakdown
      expect(offer.price.baseFare).toBeGreaterThan(0);
      expect(offer.price.mandatoryTaxesAndFees).toBeGreaterThanOrEqual(0);
      expect(offer.price.ticketTotal).toBe(
        offer.price.baseFare + offer.price.mandatoryTaxesAndFees + (offer.price.serviceCharges || 0)
      );
      expect(offer.price.currency).toBe('INR');

      // Booking verification
      expect(offer.booking.url).toMatch(/^https?:\/\//);
      expect(offer.booking.isOfficialDeepLink).toBe(true);

      // Availability status
      expect(['AVAILABLE', 'WAITLIST', 'RAC', 'SOLD_OUT', 'UNKNOWN']).toContain(
        offer.availability.status
      );
    }
  });

  // Acceptance Criterion 2: Providers can fail independently (Fault Isolation)
  it('should isolate failures when one provider fails or times out without blocking others', async () => {
    // Register a failing mock provider
    const failingProvider: TransportProvider = {
      code: 'FAILING_AIRLINE',
      name: 'Failing Airlines Inc',
      mode: 'FLIGHT',
      isEnabled: true,
      search: async () => {
        throw new ProviderError('FAILING_AIRLINE', 'Simulated API connection failure', {
          isTransient: true,
          statusCode: 503,
        });
      },
    };

    // Register a timed-out provider
    const timingOutProvider: TransportProvider = {
      code: 'SLOW_BUS',
      name: 'Slow Bus Logistics',
      mode: 'BUS',
      isEnabled: true,
      search: async () => {
        throw new ProviderTimeoutError('SLOW_BUS', 2000);
      },
    };

    registry.register(failingProvider);
    registry.register(timingOutProvider);

    const result = await orchestrator.search(sampleQuery);

    // Offers from IRCTC, IndiGo, Air India, RedBus must still be returned!
    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.meta.successfulProviders).toContain('IRCTC');
    expect(result.meta.successfulProviders).toContain('INDIGO');

    // Errors must record both failed providers without crashing
    expect(result.meta.failedProviders).toContain('FAILING_AIRLINE');
    expect(result.meta.failedProviders).toContain('SLOW_BUS');
    expect(result.errors.length).toBe(2);

    const failingError = result.errors.find((e) => e.providerCode === 'FAILING_AIRLINE');
    expect(failingError?.message).toContain('Simulated API connection failure');
    expect(failingError?.isTransient).toBe(true);
  });

  // Acceptance Criterion 3: Duplicate offers detection & natural key deduplication
  it('should detect and deduplicate offers with matching natural keys', () => {
    const offer1: NormalizedTransportOffer = {
      id: 'offer-1',
      naturalKey: 'TRAIN:IRCTC:20977:2026-11-20T06:00:00+05:30:NDLS:JP',
      providerCode: 'IRCTC',
      providerName: 'Indian Railways',
      mode: 'TRAIN',
      category: 'BEST_VALUE',
      operator: 'Indian Railways (IRCTC)',
      identifier: '20977 - Vande Bharat Express',
      origin: {
        timestamp: '2026-11-20T06:00:00+05:30',
        timezone: 'Asia/Kolkata',
        hubCode: 'NDLS',
        hubName: 'New Delhi',
        city: 'Delhi',
      },
      destination: {
        timestamp: '2026-11-20T09:50:00+05:30',
        timezone: 'Asia/Kolkata',
        hubCode: 'JP',
        hubName: 'Jaipur',
        city: 'Jaipur',
      },
      durationMinutes: 230,
      price: {
        baseFare: 1040,
        mandatoryTaxesAndFees: 120,
        ticketTotal: 1160,
        currency: 'INR',
        transferCostEstimate: null,
        estimatedGrandTotal: 1160,
      },
      availability: {
        status: 'AVAILABLE',
        seatsRemaining: 42,
        seatClass: 'CC',
      },
      booking: {
        url: 'https://www.irctc.co.in',
        isOfficialDeepLink: true,
      },
      lastCheckedTimestamp: '2026-10-22T00:00:00+05:30',
      dataSource: { type: 'DEMO', isDemonstration: true },
    };

    // Duplicate with slightly lower price (should replace offer1)
    const offer2: NormalizedTransportOffer = {
      ...offer1,
      id: 'offer-2-cheaper',
      price: {
        ...offer1.price,
        baseFare: 990,
        ticketTotal: 1110,
        estimatedGrandTotal: 1110,
      },
    };

    const { uniqueOffers, duplicateCount } = OfferNormalizationService.deduplicate([
      offer1,
      offer2,
    ]);

    expect(duplicateCount).toBe(1);
    expect(uniqueOffers.length).toBe(1);
    expect(uniqueOffers[0].id).toBe('offer-2-cheaper');
    expect(uniqueOffers[0].price.ticketTotal).toBe(1110);
  });

  // Acceptance Criterion 4: Safe handling of invalid/incomplete data without inventing fields
  it('should not invent unknown availability or missing transfer costs', () => {
    const rawOfferWithoutTransfer: NormalizedTransportOffer = {
      id: 'no-transfer-offer',
      naturalKey: 'BUS:PRIVATE:XYZ:2026-11-20T22:00:00+05:30:DEL:JAI',
      providerCode: 'PRIVATE_BUS',
      providerName: 'Private Bus Operator',
      mode: 'BUS',
      category: 'CHEAPEST',
      operator: 'Private Operator',
      identifier: 'Bus XYZ',
      origin: {
        timestamp: '2026-11-20T22:00:00+05:30',
        timezone: 'Asia/Kolkata',
        hubCode: 'DEL',
        hubName: 'Delhi Border',
        city: 'Delhi',
      },
      destination: {
        timestamp: '2026-11-21T04:00:00+05:30',
        timezone: 'Asia/Kolkata',
        hubCode: 'JAI',
        hubName: 'Jaipur Bypass',
        city: 'Jaipur',
      },
      durationMinutes: 360,
      price: {
        baseFare: 500,
        mandatoryTaxesAndFees: 25,
        ticketTotal: 525,
        currency: 'INR',
        // IMPORTANT: Must be null when unknown, not 0
        transferCostEstimate: null,
        estimatedGrandTotal: 525,
      },
      availability: {
        status: 'UNKNOWN',
        seatsRemaining: null, // Unknown must remain null
        seatClass: null,
      },
      booking: {
        url: 'https://example.com/book',
        isOfficialDeepLink: false,
      },
      lastCheckedTimestamp: '2026-10-22T00:00:00+05:30',
      dataSource: { type: 'DEMO', isDemonstration: true },
    };

    const validated = OfferNormalizationService.validate(rawOfferWithoutTransfer);
    expect(validated.price.transferCostEstimate).toBeNull();
    expect(validated.availability.status).toBe('UNKNOWN');
    expect(validated.availability.seatsRemaining).toBeNull();
  });

  // Acceptance Criterion 5: Ranking and Categorization (Cheapest, Fastest, Best Value)
  it('should rank offers correctly into CHEAPEST, FASTEST, and BEST_VALUE', async () => {
    const result = await orchestrator.search(sampleQuery);
    const offers = result.offers;

    const cheapest = offers.find((o) => o.category === 'CHEAPEST');
    const fastest = offers.find((o) => o.category === 'FASTEST');
    const bestValue = offers.find((o) => o.category === 'BEST_VALUE');

    expect(cheapest).toBeDefined();
    expect(fastest).toBeDefined();
    expect(bestValue).toBeDefined();

    // Fastest should have the minimal duration (typically flight ~60-65m)
    for (const o of offers) {
      expect(fastest!.durationMinutes).toBeLessThanOrEqual(o.durationMinutes);
    }

    // Cheapest should have the minimal ticket total (typically bus ~544)
    for (const o of offers) {
      expect(cheapest!.price.ticketTotal).toBeLessThanOrEqual(o.price.ticketTotal);
    }
  });

  // Acceptance Criterion 6: Provider Registry Management
  it('should allow enabling and disabling providers dynamically without breaking search', async () => {
    // Disable flights
    registry.disable('INDIGO');
    registry.disable('AIR_INDIA');

    const result = await orchestrator.search(sampleQuery);
    expect(result.meta.searchedProviders).not.toContain('INDIGO');
    expect(result.meta.searchedProviders).not.toContain('AIR_INDIA');
    expect(result.offers.every((o) => o.mode !== 'FLIGHT')).toBe(true);

    // Re-enable IndiGo
    registry.enable('INDIGO');
    const resultWithIndigo = await orchestrator.search(sampleQuery);
    expect(resultWithIndigo.meta.searchedProviders).toContain('INDIGO');
  });
});
