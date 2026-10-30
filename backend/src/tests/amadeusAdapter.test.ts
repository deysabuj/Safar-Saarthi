import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmadeusClient } from '../integrations/transport/amadeus/client.js';
import { AmadeusFlightAdapter } from '../integrations/transport/adapters/amadeus.adapter.js';
import { RAW_AMADEUS_FLIGHT_OFFERS_RESPONSE } from '../integrations/transport/fixtures/amadeus.fixture.js';
import { normalizedTransportOfferSchema } from '../integrations/transport/schemas.js';
import {
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderUnavailableError,
} from '../integrations/transport/errors.js';

describe('Amadeus Flight Adapter & Client (Mocked)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should acquire and cache OAuth access token without redundant network calls', async () => {
    const client = new AmadeusClient({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
      baseUrl: 'https://test.api.amadeus.com',
    });

    // Mock OAuth Token response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'amadeusOAuth2Token',
        username: 'test@example.com',
        application_name: 'SafarSaarthi',
        client_id: 'mock-client-id',
        token_type: 'Bearer',
        access_token: 'mock-token-xyz-123',
        expires_in: 1799,
        state: 'approved',
        scope: '',
      }),
    });

    const token1 = await client.getAccessToken();
    expect(token1).toBe('mock-token-xyz-123');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call should return cached token immediately without second fetch
    const token2 = await client.getAccessToken();
    expect(token2).toBe('mock-token-xyz-123');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should search and normalize Amadeus flight offers with full price, stops, and baggage details', async () => {
    const client = new AmadeusClient({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
    });

    // 1. Mock token call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'mock-token-abc',
        expires_in: 1799,
      }),
    });

    // 2. Mock flight search call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => RAW_AMADEUS_FLIGHT_OFFERS_RESPONSE,
    });

    const adapter = new AmadeusFlightAdapter({ client });
    const offers = await adapter.search({
      origin: 'New Delhi (DEL)',
      destination: 'Mumbai (BOM)',
      departureDate: '2026-11-20',
      travelers: 1,
    });

    expect(offers.length).toBe(2);

    for (const offer of offers) {
      // Must strictly satisfy the normalized transport offer schema
      const validation = normalizedTransportOfferSchema.safeParse(offer);
      expect(validation.success).toBe(true);

      expect(offer.mode).toBe('FLIGHT');
      expect(offer.providerCode).toBe('AMADEUS');
      expect(offer.price.currency).toBe('INR');
      expect(offer.price.ticketTotal).toBeGreaterThan(0);
      expect(offer.origin.hubCode).toBe('DEL');
      expect(offer.destination.hubCode).toBe('BOM');
      expect(offer.dataSource.type).toBe('LIVE');
      expect(offer.dataSource.isDemonstration).toBe(false);
      expect(offer.details?.flight).toBeDefined();
    }

    // Offer 1: Air India (AI-865)
    const aiOffer = offers.find((o) => o.operator === 'Air India');
    expect(aiOffer).toBeDefined();
    expect(aiOffer!.identifier).toContain('AI-865');
    expect(aiOffer!.price.baseFare).toBe(4100);
    expect(aiOffer!.price.ticketTotal).toBe(4950);
    expect(aiOffer!.durationMinutes).toBe(135); // PT2H15M
    expect(aiOffer!.details?.flight?.stops).toBe(0);
    expect(aiOffer!.details?.flight?.baggageAllowanceKg).toBe(15);
    expect(aiOffer!.details?.flight?.mealIncluded).toBe(true);
    expect(aiOffer!.booking.url).toContain('https://www.airindia.com');

    // Offer 2: IndiGo (6E-2042)
    const indigoOffer = offers.find((o) => o.operator === 'IndiGo Airlines');
    expect(indigoOffer).toBeDefined();
    expect(indigoOffer!.identifier).toContain('6E-2042');
    expect(indigoOffer!.price.baseFare).toBe(3700);
    expect(indigoOffer!.price.ticketTotal).toBe(4450);
    expect(indigoOffer!.durationMinutes).toBe(125); // PT2H05M
    expect(indigoOffer!.booking.url).toContain('https://www.goindigo.in');
  });

  it('should parse ISO 8601 durations and extract Indian IATA airport codes accurately', () => {
    expect(AmadeusClient.parseIsoDurationToMinutes('PT1H10M')).toBe(70);
    expect(AmadeusClient.parseIsoDurationToMinutes('PT2H15M')).toBe(135);
    expect(AmadeusClient.parseIsoDurationToMinutes('PT55M')).toBe(55);
    expect(AmadeusClient.parseIsoDurationToMinutes('PT3H')).toBe(180);

    expect(AmadeusClient.extractIataCode('New Delhi (DEL)')).toBe('DEL');
    expect(AmadeusClient.extractIataCode('Mumbai (BOM)')).toBe('BOM');
    expect(AmadeusClient.extractIataCode('Jaipur (JAI)')).toBe('JAI');
    expect(AmadeusClient.extractIataCode('Bengaluru (BLR)')).toBe('BLR');
    expect(AmadeusClient.extractIataCode('Kochi (COK)')).toBe('COK');
    expect(AmadeusClient.extractIataCode('Goa (GOI)')).toBe('GOI');
    expect(AmadeusClient.extractIataCode('DEL')).toBe('DEL');
  });

  it('should handle rate limits (HTTP 429) and throw ProviderRateLimitError', async () => {
    const client = new AmadeusClient({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'token-xyz', expires_in: 1799 }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '5' }),
      text: async () => 'Rate limit exceeded',
    });

    const adapter = new AmadeusFlightAdapter({ client, maxRetries: 0 });
    await expect(
      adapter.search({
        origin: 'DEL',
        destination: 'BOM',
        departureDate: '2026-11-20',
        travelers: 1,
      })
    ).rejects.toThrow(ProviderRateLimitError);
  });

  it('should handle token expiration (HTTP 401) and clear token cache', async () => {
    const client = new AmadeusClient({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'stale-token', expires_in: 1799 }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const adapter = new AmadeusFlightAdapter({ client, maxRetries: 0 });
    await expect(
      adapter.search({
        origin: 'DEL',
        destination: 'BOM',
        departureDate: '2026-11-20',
        travelers: 1,
      })
    ).rejects.toThrow(ProviderError);
  });

  it('should handle server errors (HTTP 500) and throw ProviderUnavailableError', async () => {
    const client = new AmadeusClient({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'token-abc', expires_in: 1799 }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    });

    const adapter = new AmadeusFlightAdapter({ client, maxRetries: 0 });
    await expect(
      adapter.search({
        origin: 'DEL',
        destination: 'BOM',
        departureDate: '2026-11-20',
        travelers: 1,
      })
    ).rejects.toThrow(ProviderUnavailableError);
  });

  it('should handle unconfigured state gracefully by returning empty offers and labeling status', async () => {
    // Adapter created without client credentials
    const unconfiguredClient = new AmadeusClient({
      clientId: '',
      clientSecret: '',
    });
    const adapter = new AmadeusFlightAdapter({ client: unconfiguredClient });

    expect(adapter.isConfigured()).toBe(false);

    const offers = await adapter.search({
      origin: 'DEL',
      destination: 'JAI',
      departureDate: '2026-11-20',
      travelers: 1,
    });

    // Must not throw, and must not invent fake live fares
    expect(offers).toEqual([]);
  });

  it('should handle zero results returned by provider without inventing flights', async () => {
    const client = new AmadeusClient({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'valid-token', expires_in: 1799 }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        meta: { count: 0 },
        data: [],
      }),
    });

    const adapter = new AmadeusFlightAdapter({ client });
    const offers = await adapter.search({
      origin: 'DEL',
      destination: 'COK',
      departureDate: '2026-11-20',
      travelers: 1,
    });

    expect(offers).toEqual([]);
  });

  it('should reject token acquisition with ProviderError when invalid credentials are provided', async () => {
    const client = new AmadeusClient({
      clientId: 'invalid-client-id',
      clientSecret: 'invalid-secret',
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => JSON.stringify({ error: 'invalid_client', error_description: 'Bad credentials' }),
    });

    await expect(client.getAccessToken()).rejects.toThrow(ProviderError);
  });

  it('should throw ProviderTimeoutError when provider request is aborted or times out', async () => {
    const client = new AmadeusClient({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
      timeoutMs: 100,
    });

    // 1. Mock token call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock-token', expires_in: 1799 }),
    });

    // 2. Abort controller simulating a timeout abort
    const abortController = new AbortController();
    abortController.abort();

    await expect(
      client.searchFlightOffers(
        {
          originLocationCode: 'DEL',
          destinationLocationCode: 'BOM',
          departureDate: '2026-11-20',
          adults: 1,
        },
        abortController.signal
      )
    ).rejects.toThrow(ProviderTimeoutError);
  });

  it('should handle invalid search parameters (HTTP 400) and surface provider error details', async () => {
    const client = new AmadeusClient({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'valid-token', expires_in: 1799 }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        errors: [
          {
            status: 400,
            code: 4926,
            title: 'INVALID DATE',
            detail: 'The departure date must be in the future',
          },
        ],
      }),
    });

    const adapter = new AmadeusFlightAdapter({ client, maxRetries: 0 });
    await expect(
      adapter.search({
        origin: 'DEL',
        destination: 'BOM',
        departureDate: '2020-01-01',
        travelers: 1,
      })
    ).rejects.toThrow(/INVALID DATE.*departure date must be in the future/);
  });

  it('should gracefully skip malformed offers in provider responses without throwing or returning corrupt data', async () => {
    const client = new AmadeusClient({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'valid-token', expires_in: 1799 }),
    });

    const malformedResponse = {
      meta: { count: 4 },
      data: [
        // Valid offer from fixture
        RAW_AMADEUS_FLIGHT_OFFERS_RESPONSE.data[0],
        // Malformed item 1: Missing itineraries
        { id: 'bad-1', type: 'flight-offer', itineraries: [] },
        // Malformed item 2: Missing segments
        { id: 'bad-2', type: 'flight-offer', itineraries: [{ segments: [] }] },
        // Malformed item 3: Missing price
        {
          id: 'bad-3',
          type: 'flight-offer',
          itineraries: [
            {
              duration: 'PT2H',
              segments: [
                {
                  departure: { iataCode: 'DEL', at: '2026-11-20T10:00:00' },
                  arrival: { iataCode: 'BOM', at: '2026-11-20T12:00:00' },
                  carrierCode: 'AI',
                  number: '101',
                },
              ],
            },
          ],
        },
      ],
      dictionaries: RAW_AMADEUS_FLIGHT_OFFERS_RESPONSE.dictionaries,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => malformedResponse,
    });

    const adapter = new AmadeusFlightAdapter({ client });
    const offers = await adapter.search({
      origin: 'DEL',
      destination: 'BOM',
      departureDate: '2026-11-20',
      travelers: 1,
    });

    // Only the single valid offer should be kept
    expect(offers.length).toBe(1);
    expect(offers[0].operator).toBe('Air India');
  });

  it('should throw ProviderError when client is unconfigured and access token is requested', async () => {
    const unconfiguredClient = new AmadeusClient({
      clientId: '',
      clientSecret: '',
    });

    expect(unconfiguredClient.isConfigured()).toBe(false);
    await expect(unconfiguredClient.getAccessToken()).rejects.toThrow(
      /Amadeus credentials.*not configured/
    );
  });

  it('should throw ProviderUnavailableError on network connection failure during authentication', async () => {
    const client = new AmadeusClient({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
    });

    mockFetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND test.api.amadeus.com'));

    await expect(client.getAccessToken()).rejects.toThrow(ProviderUnavailableError);
  });
});

// Live Integration Test — only runs when valid real Amadeus credentials are provided in environment
describe('Amadeus Live Integration (Conditional)', () => {
  const isLiveConfigured = Boolean(
    process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET
  );

  it.runIf(isLiveConfigured)(
    'should query live Amadeus GDS flight offers for Delhi to Mumbai',
    async () => {
      const adapter = new AmadeusFlightAdapter();
      expect(adapter.isConfigured()).toBe(true);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 14);
      const departureDate = tomorrow.toISOString().split('T')[0];

      const offers = await adapter.search({
        origin: 'DEL',
        destination: 'BOM',
        departureDate,
        travelers: 1,
      });

      expect(Array.isArray(offers)).toBe(true);
      if (offers.length > 0) {
        const first = offers[0];
        expect(first.mode).toBe('FLIGHT');
        expect(first.providerCode).toBe('AMADEUS');
        expect(first.dataSource.type).toBe('LIVE');
        expect(first.dataSource.isDemonstration).toBe(false);
      }
    }
  );
});
