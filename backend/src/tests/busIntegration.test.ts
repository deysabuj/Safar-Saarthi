import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedBusClient } from '../integrations/transport/bus/client.js';
import { RedBusAdapter } from '../integrations/transport/adapters/redbus.adapter.js';
import { RAW_REDBUS_RESPONSE } from '../integrations/transport/fixtures/redbus.fixture.js';
import { normalizedTransportOfferSchema } from '../integrations/transport/schemas.js';
import {
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderUnavailableError,
} from '../integrations/transport/errors.js';

describe('Intercity Bus Integration & RedBus Adapter', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('City Resolution', () => {
    it('should resolve Indian city names to standard RedBus city metadata', () => {
      expect(RedBusClient.resolveCity('Delhi')).toEqual({ id: '130', name: 'Delhi' });
      expect(RedBusClient.resolveCity('New Delhi (DEL)')).toEqual({ id: '130', name: 'Delhi' });
      expect(RedBusClient.resolveCity('Jaipur')).toEqual({ id: '135', name: 'Jaipur' });
      expect(RedBusClient.resolveCity('Mumbai')).toEqual({ id: '462', name: 'Mumbai' });
      expect(RedBusClient.resolveCity('Bangalore')).toEqual({ id: '122', name: 'Bangalore' });
      expect(RedBusClient.resolveCity('Bengaluru (BLR)')).toEqual({ id: '122', name: 'Bangalore' });
      expect(RedBusClient.resolveCity('Pune')).toEqual({ id: '138', name: 'Pune' });
      expect(RedBusClient.resolveCity('Goa')).toEqual({ id: '210', name: 'Goa' });
    });
  });

  describe('Multi-Operator Benchmark / Unconfigured Search (Delhi -> Jaipur)', () => {
    it('should normalize bus offers from multiple distinct operators complying with schema', async () => {
      const unconfiguredClient = new RedBusClient({ apiKey: '' });
      const adapter = new RedBusAdapter({ client: unconfiguredClient });

      expect(adapter.isConfigured()).toBe(false);

      const offers = await adapter.search({
        origin: 'Delhi',
        destination: 'Jaipur',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBe(2);

      for (const offer of offers) {
        const validation = normalizedTransportOfferSchema.safeParse(offer);
        expect(validation.success).toBe(true);

        expect(offer.mode).toBe('BUS');
        expect(offer.providerCode).toBe('REDBUS');
        expect(offer.dataSource.type).toBe('DEMO');
        expect(offer.dataSource.isDemonstration).toBe(true);
        expect(offer.price.currency).toBe('INR');
        expect(offer.price.ticketTotal).toBeGreaterThan(0);
        expect(offer.price.transferCostEstimate).toBeDefined();

        expect(offer.details?.bus).toBeDefined();
        expect(offer.details?.bus?.boardingPoint).toBeDefined();
        expect(offer.details?.bus?.droppingPoint).toBeDefined();
        expect(offer.booking.url).toBeDefined();
      }

      // Check Operator 1: Zingbus Electric Intercity
      const zingbusOffer = offers.find((o) => o.operator.includes('Zingbus'));
      expect(zingbusOffer).toBeDefined();
      expect(zingbusOffer!.details?.bus?.isSleeper).toBe(true);
      expect(zingbusOffer!.details?.bus?.hasChargingPoint).toBe(true);
      expect(zingbusOffer!.availability.seatsRemaining).toBe(22);
      expect(zingbusOffer!.origin.hubName).toContain('ISBT Kashmiri Gate');
      expect(zingbusOffer!.destination.hubName).toContain('Sindhi Camp');
      expect(zingbusOffer!.booking.url).toContain('https://www.redbus.in');

      // Check Operator 2: RSRTC State Transport
      const rsrtcOffer = offers.find((o) => o.operator.includes('RSRTC'));
      expect(rsrtcOffer).toBeDefined();
      expect(rsrtcOffer!.details?.bus?.isSleeper).toBe(false);
      expect(rsrtcOffer!.availability.seatsRemaining).toBe(16);
      expect(rsrtcOffer!.origin.hubName).toContain('Bikaner House');
      expect(rsrtcOffer!.booking.url).toContain('rsrtconline.rajasthan.gov.in');
    });

    it('should return empty offers for unconfigured queries on unsupported corridors without inventing fake buses', async () => {
      const unconfiguredClient = new RedBusClient({ apiKey: '' });
      const adapter = new RedBusAdapter({ client: unconfiguredClient });

      const offers = await adapter.search({
        origin: 'Guwahati',
        destination: 'Srinagar',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers).toEqual([]);
    });
  });

  describe('Live Bus Search & Multi-Operator Dynamic Parsing', () => {
    it('should query authorized API and dynamically normalize multiple operators without schema hardcoding', async () => {
      const client = new RedBusClient({ apiKey: 'mock-redbus-key' });

      // Custom multi-operator response fixture
      const dynamicMultiOperatorResponse = {
        success: true,
        originCity: 'Bangalore',
        destinationCity: 'Chennai',
        availableBuses: [
          {
            serviceId: 'VRL-101',
            operatorName: 'VRL Travels Luxury Services',
            busType: 'I-Shift Multi-Axle Volvo AC Sleeper',
            hasCharging: true,
            isSleeper: true,
            departure: { location: 'Madiwala, Bangalore', time: '22:30', hubCode: 'BLR-MAD' },
            arrival: { location: 'Koyambedu, Chennai', time: '05:00', hubCode: 'MAA-KOY', isNextDay: true },
            totalDurationMinutes: 390,
            pricing: { baseFare: 850, gstAndOperatorFee: 65, totalPayable: 915 },
            availableSeatsCount: 14,
            bookingDeepLink: 'https://www.redbus.in/bus-tickets/bangalore-to-chennai',
          },
          {
            serviceId: 'KSRTC-AIRAVAT-55',
            operatorName: 'KSRTC (Karnataka State Road Transport)',
            busType: 'Airavat Club Class (Multi-Axle)',
            hasCharging: true,
            isSleeper: false,
            departure: { location: 'Shanthinagar TTMC, Bangalore', time: '14:00', hubCode: 'BLR-STN' },
            arrival: { location: 'CMBT Koyambedu, Chennai', time: '20:15', hubCode: 'MAA-CMBT', isNextDay: false },
            totalDurationMinutes: 375,
            pricing: { baseFare: 740, gstAndOperatorFee: 37, totalPayable: 777 },
            availableSeatsCount: 28,
            bookingDeepLink: 'https://ksrtc.in',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => dynamicMultiOperatorResponse,
      });

      const adapter = new RedBusAdapter({ client });
      expect(adapter.isConfigured()).toBe(true);

      const offers = await adapter.search({
        origin: 'Bangalore',
        destination: 'Chennai',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify VRL Travels
      const vrl = offers.find((o) => o.operator === 'VRL Travels Luxury Services');
      expect(vrl).toBeDefined();
      expect(vrl!.dataSource.type).toBe('LIVE');
      expect(vrl!.dataSource.isDemonstration).toBe(false);
      expect(vrl!.price.ticketTotal).toBe(915);
      expect(vrl!.origin.hubName).toBe('Madiwala, Bangalore');

      // Verify KSRTC
      const ksrtc = offers.find((o) => o.operator.includes('KSRTC'));
      expect(ksrtc).toBeDefined();
      expect(ksrtc!.dataSource.type).toBe('LIVE');
      expect(ksrtc!.price.ticketTotal).toBe(777);
      expect(ksrtc!.booking.url).toBe('https://ksrtc.in');
    });

    it('should handle zero buses returned by live provider without hallucinating', async () => {
      const client = new RedBusClient({ apiKey: 'valid-key' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          originCity: 'Delhi',
          destinationCity: 'Mumbai',
          availableBuses: [],
        }),
      });

      const adapter = new RedBusAdapter({ client });
      const offers = await adapter.search({
        origin: 'Delhi',
        destination: 'Mumbai',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limits (HTTP 429) and throw ProviderRateLimitError', async () => {
      const client = new RedBusClient({ apiKey: 'mock-key' });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '8' }),
        text: async () => 'Rate limit exceeded',
      });

      const adapter = new RedBusAdapter({ client, maxRetries: 0 });
      await expect(
        adapter.search({
          origin: 'Delhi',
          destination: 'Jaipur',
          departureDate: '2026-11-20',
          travelers: 1,
        })
      ).rejects.toThrow(ProviderRateLimitError);
    });

    it('should handle unauthorized API key (HTTP 401) and throw ProviderError', async () => {
      const client = new RedBusClient({ apiKey: 'bad-key' });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const adapter = new RedBusAdapter({ client, maxRetries: 0 });
      await expect(
        adapter.search({
          origin: 'Delhi',
          destination: 'Jaipur',
          departureDate: '2026-11-20',
          travelers: 1,
        })
      ).rejects.toThrow(ProviderError);
    });

    it('should handle server errors (HTTP 500) and throw ProviderUnavailableError', async () => {
      const client = new RedBusClient({ apiKey: 'mock-key' });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const adapter = new RedBusAdapter({ client, maxRetries: 0 });
      await expect(
        adapter.search({
          origin: 'Delhi',
          destination: 'Jaipur',
          departureDate: '2026-11-20',
          travelers: 1,
        })
      ).rejects.toThrow(ProviderUnavailableError);
    });

    it('should handle request abort / timeout and throw ProviderTimeoutError', async () => {
      const client = new RedBusClient({ apiKey: 'mock-key', timeoutMs: 100 });
      const controller = new AbortController();
      controller.abort();

      await expect(
        client.searchAvailableBuses(
          {
            sourceCity: 'Delhi',
            destinationCity: 'Jaipur',
            doj: '2026-11-20',
          },
          controller.signal
        )
      ).rejects.toThrow(ProviderTimeoutError);
    });

    it('should throw ProviderError when direct search is invoked on an unconfigured client', async () => {
      const client = new RedBusClient({ apiKey: '' });
      expect(client.isConfigured()).toBe(false);

      await expect(
        client.searchAvailableBuses({
          sourceCity: 'Delhi',
          destinationCity: 'Jaipur',
          doj: '2026-11-20',
        })
      ).rejects.toThrow(/credentials.*not configured/);
    });
  });
});

// Conditional Live RedBus Test
describe('RedBus Live Integration (Conditional)', () => {
  const isLiveConfigured = Boolean(process.env.REDBUS_API_KEY && process.env.REDBUS_API_KEY.trim().length > 0);

  it.runIf(isLiveConfigured)(
    'should query live intercity buses between Delhi and Jaipur from authorized provider',
    async () => {
      const adapter = new RedBusAdapter();
      expect(adapter.isConfigured()).toBe(true);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);
      const departureDate = tomorrow.toISOString().split('T')[0];

      const offers = await adapter.search({
        origin: 'Delhi',
        destination: 'Jaipur',
        departureDate,
        travelers: 1,
      });

      expect(Array.isArray(offers)).toBe(true);
      if (offers.length > 0) {
        expect(offers[0].mode).toBe('BUS');
        expect(offers[0].dataSource.type).toBe('LIVE');
      }
    }
  );
});
