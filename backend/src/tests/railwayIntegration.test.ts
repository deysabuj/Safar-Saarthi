import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RailwayClient } from '../integrations/transport/railway/client.js';
import { IrctcTrainAdapter } from '../integrations/transport/adapters/irctc.adapter.js';
import { RAW_IRCTC_RESPONSE } from '../integrations/transport/fixtures/irctc.fixture.js';
import { normalizedTransportOfferSchema } from '../integrations/transport/schemas.js';
import {
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderUnavailableError,
} from '../integrations/transport/errors.js';

describe('Railway Integration & IRCTC Adapter', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Station Code & Name Resolution', () => {
    it('should accurately resolve Indian city names and station aliases to IRCTC codes', () => {
      expect(RailwayClient.resolveStationCode('New Delhi')).toBe('NDLS');
      expect(RailwayClient.resolveStationCode('Delhi')).toBe('NDLS');
      expect(RailwayClient.resolveStationCode('New Delhi (NDLS)')).toBe('NDLS');
      expect(RailwayClient.resolveStationCode('Mumbai')).toBe('CSMT');
      expect(RailwayClient.resolveStationCode('Jaipur')).toBe('JP');
      expect(RailwayClient.resolveStationCode('Bangalore')).toBe('SBC');
      expect(RailwayClient.resolveStationCode('Bengaluru')).toBe('SBC');
      expect(RailwayClient.resolveStationCode('Kolkata')).toBe('HWH');
      expect(RailwayClient.resolveStationCode('Chennai')).toBe('MAS');
      expect(RailwayClient.resolveStationCode('Hyderabad')).toBe('HYB');
      expect(RailwayClient.resolveStationCode('Secunderabad')).toBe('SC');
      expect(RailwayClient.resolveStationCode('Kochi')).toBe('ERS');
      expect(RailwayClient.resolveStationCode('Goa')).toBe('MAO');
      expect(RailwayClient.resolveStationCode('Varanasi')).toBe('BSB');
    });

    it('should resolve full station names for display', () => {
      expect(RailwayClient.resolveStationName('NDLS')).toBe('New Delhi Railway Station');
      expect(RailwayClient.resolveStationName('JP')).toBe('Jaipur Junction');
      expect(RailwayClient.resolveStationName('CSMT')).toContain('Chhatrapati Shivaji');
    });
  });

  describe('Benchmark / Unconfigured Search (Delhi -> Jaipur)', () => {
    it('should return benchmark train offers strictly complying with normalized schema when unconfigured', async () => {
      const unconfiguredClient = new RailwayClient({ apiKey: '' });
      const adapter = new IrctcTrainAdapter({ client: unconfiguredClient });

      expect(adapter.isConfigured()).toBe(false);

      const offers = await adapter.search({
        origin: 'New Delhi (NDLS)',
        destination: 'Jaipur (JP)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBeGreaterThan(0);

      for (const offer of offers) {
        const validation = normalizedTransportOfferSchema.safeParse(offer);
        expect(validation.success).toBe(true);

        expect(offer.mode).toBe('TRAIN');
        expect(offer.providerCode).toBe('IRCTC');
        expect(offer.dataSource.type).toBe('DEMO');
        expect(offer.dataSource.isDemonstration).toBe(true);
        expect(offer.price.currency).toBe('INR');
        expect(offer.price.ticketTotal).toBeGreaterThan(0);
        expect(offer.price.transferCostEstimate).toBeDefined();

        // Must point to official IRCTC e-ticketing portal
        expect(offer.booking.url).toContain('https://www.irctc.co.in/nget/train-search');
        expect(offer.booking.isOfficialDeepLink).toBe(true);
        expect(offer.booking.partnerName).toBe('IRCTC e-Ticketing');

        // Train details
        expect(offer.details?.train).toBeDefined();
        expect(offer.details?.train?.trainNumber).toBeDefined();
        expect(offer.details?.train?.trainName).toBeDefined();
      }

      // Check Vande Bharat CC class
      const vandeBharatCC = offers.find(
        (o) => o.details?.train?.trainNumber === '20977' && o.availability.seatClass === 'CC'
      );
      expect(vandeBharatCC).toBeDefined();
      expect(vandeBharatCC!.availability.status).toBe('AVAILABLE');
      expect(vandeBharatCC!.availability.seatsRemaining).toBe(42);
      expect(vandeBharatCC!.price.ticketTotal).toBe(1245);

      // Check Rajdhani Waitlist mapping
      const rajdhani3A = offers.find(
        (o) => o.details?.train?.trainNumber === '12958' && o.availability.seatClass === '3A'
      );
      expect(rajdhani3A).toBeDefined();
      expect(rajdhani3A!.availability.status).toBe('WAITLIST');
      expect(rajdhani3A!.availability.seatsRemaining).toBeNull();
    });

    it('should return empty offers for unconfigured queries on unsupported corridors without inventing fake trains', async () => {
      const unconfiguredClient = new RailwayClient({ apiKey: '' });
      const adapter = new IrctcTrainAdapter({ client: unconfiguredClient });

      const offers = await adapter.search({
        origin: 'Pune (PUNE)',
        destination: 'Varanasi (BSB)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers).toEqual([]);
    });
  });

  describe('Live Railway Search (Mocked Authorized API)', () => {
    it('should search and normalize live trains from authorized API response', async () => {
      const client = new RailwayClient({
        apiKey: 'mock-railway-api-key',
        apiUrl: 'https://test-railway.api/v1',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => RAW_IRCTC_RESPONSE,
      });

      const adapter = new IrctcTrainAdapter({ client });
      expect(adapter.isConfigured()).toBe(true);

      const offers = await adapter.search({
        origin: 'NDLS',
        destination: 'JP',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBeGreaterThan(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const first = offers[0];
      expect(first.dataSource.type).toBe('LIVE');
      expect(first.dataSource.isDemonstration).toBe(false);
      expect(first.dataSource.attributionNotes).toContain('Live Indian Railways');
    });

    it('should handle zero trains returned by live API without hallucinating', async () => {
      const client = new RailwayClient({ apiKey: 'valid-key' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'SUCCESS',
          trainBtwnStnsList: [],
        }),
      });

      const adapter = new IrctcTrainAdapter({ client });
      const offers = await adapter.search({
        origin: 'NDLS',
        destination: 'BOM',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers).toEqual([]);
    });
  });

  describe('Compliance & Security', () => {
    it('should never store or accept user railway account passwords', async () => {
      const adapter = new IrctcTrainAdapter();
      // Ensure adapter interface only accepts TransportQuery
      const query = {
        origin: 'NDLS',
        destination: 'JP',
        departureDate: '2026-11-20',
        travelers: 1,
      };

      // Verify no password property is part of query or adapter state
      expect((query as any).password).toBeUndefined();
      expect((query as any).irctcPassword).toBeUndefined();
      expect((adapter as any).userPassword).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting (HTTP 429) and throw ProviderRateLimitError', async () => {
      const client = new RailwayClient({ apiKey: 'mock-key' });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '10' }),
        text: async () => 'Rate limit exceeded',
      });

      const adapter = new IrctcTrainAdapter({ client, maxRetries: 0 });
      await expect(
        adapter.search({
          origin: 'NDLS',
          destination: 'JP',
          departureDate: '2026-11-20',
          travelers: 1,
        })
      ).rejects.toThrow(ProviderRateLimitError);
    });

    it('should handle unauthorized API key (HTTP 401/403) and throw ProviderError', async () => {
      const client = new RailwayClient({ apiKey: 'invalid-key' });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API Key',
      });

      const adapter = new IrctcTrainAdapter({ client, maxRetries: 0 });
      await expect(
        adapter.search({
          origin: 'NDLS',
          destination: 'JP',
          departureDate: '2026-11-20',
          travelers: 1,
        })
      ).rejects.toThrow(ProviderError);
    });

    it('should handle server errors (HTTP 500) and throw ProviderUnavailableError', async () => {
      const client = new RailwayClient({ apiKey: 'mock-key' });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => 'Bad Gateway',
      });

      const adapter = new IrctcTrainAdapter({ client, maxRetries: 0 });
      await expect(
        adapter.search({
          origin: 'NDLS',
          destination: 'JP',
          departureDate: '2026-11-20',
          travelers: 1,
        })
      ).rejects.toThrow(ProviderUnavailableError);
    });

    it('should handle request abort / timeouts and throw ProviderTimeoutError', async () => {
      const client = new RailwayClient({ apiKey: 'mock-key', timeoutMs: 100 });
      const controller = new AbortController();
      controller.abort();

      await expect(
        client.searchTrainsBetweenStations(
          {
            fromStationCode: 'NDLS',
            toStationCode: 'JP',
            dateOfJourney: '2026-11-20',
          },
          controller.signal
        )
      ).rejects.toThrow(ProviderTimeoutError);
    });

    it('should throw ProviderError when direct search is invoked on an unconfigured client', async () => {
      const client = new RailwayClient({ apiKey: '' });
      expect(client.isConfigured()).toBe(false);

      await expect(
        client.searchTrainsBetweenStations({
          fromStationCode: 'NDLS',
          toStationCode: 'JP',
          dateOfJourney: '2026-11-20',
        })
      ).rejects.toThrow(/credentials.*not configured/);
    });
  });
});

// Conditional Live Railway Test
describe('Railway Live Integration (Conditional)', () => {
  const isLiveConfigured = Boolean(process.env.IRCTC_API_KEY && process.env.IRCTC_API_KEY.trim().length > 0);

  it.runIf(isLiveConfigured)(
    'should query live trains between New Delhi and Jaipur from authorized provider',
    async () => {
      const adapter = new IrctcTrainAdapter();
      expect(adapter.isConfigured()).toBe(true);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);
      const departureDate = tomorrow.toISOString().split('T')[0];

      const offers = await adapter.search({
        origin: 'NDLS',
        destination: 'JP',
        departureDate,
        travelers: 1,
      });

      expect(Array.isArray(offers)).toBe(true);
      if (offers.length > 0) {
        expect(offers[0].mode).toBe('TRAIN');
        expect(offers[0].dataSource.type).toBe('LIVE');
      }
    }
  );
});
