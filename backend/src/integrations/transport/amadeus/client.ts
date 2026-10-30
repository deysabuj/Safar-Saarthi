import {
  AmadeusFlightOffersResponse,
  AmadeusOAuthTokenResponse,
} from './types.js';
import {
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderUnavailableError,
} from '../errors.js';
import { Logger } from '../../../utils/logger.js';
import { env } from '../../../config/env.js';

export interface AmadeusClientConfig {
  clientId?: string;
  clientSecret?: string;
  environment?: 'test' | 'production';
  baseUrl?: string;
  timeoutMs?: number;
}

export class AmadeusClient {
  private clientId?: string;
  private clientSecret?: string;
  private baseUrl: string;
  private timeoutMs: number;

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private tokenPromise: Promise<string> | null = null;

  constructor(config: AmadeusClientConfig = {}) {
    this.clientId = config.clientId ?? env.AMADEUS_CLIENT_ID ?? process.env.AMADEUS_CLIENT_ID;
    this.clientSecret = config.clientSecret ?? env.AMADEUS_CLIENT_SECRET ?? process.env.AMADEUS_CLIENT_SECRET;
    const envType =
      config.environment ??
      (env.AMADEUS_ENV as 'test' | 'production') ??
      (process.env.AMADEUS_ENV as 'test' | 'production') ??
      'test';
    this.baseUrl =
      config.baseUrl ||
      (envType === 'production'
        ? 'https://api.amadeus.com'
        : 'https://test.api.amadeus.com');
    this.timeoutMs = config.timeoutMs || 5000;
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  getEnvironment(): string {
    return this.baseUrl.includes('test') ? 'test' : 'production';
  }

  /**
   * Retrieves a valid OAuth2 bearer token, reusing cached token if unexpired.
   */
  async getAccessToken(signal?: AbortSignal): Promise<string> {
    if (!this.isConfigured()) {
      throw new ProviderError('AMADEUS', 'Amadeus credentials (AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET) not configured', {
        isTransient: false,
        statusCode: 401,
      });
    }

    const now = Date.now();
    // Use cached token if valid with 60 second safety buffer
    if (this.cachedToken && this.tokenExpiresAt > now + 60000) {
      return this.cachedToken;
    }

    // Reuse in-flight token request if concurrent calls happen
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    this.tokenPromise = this.fetchNewToken(signal).finally(() => {
      this.tokenPromise = null;
    });

    return this.tokenPromise;
  }

  private async fetchNewToken(signal?: AbortSignal): Promise<string> {
    const tokenUrl = `${this.baseUrl}/v1/security/oauth2/token`;

    const bodyParams = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error(`Amadeus OAuth token failure (${response.status}): ${errorText}`, 'AMADEUS_CLIENT');
        throw new ProviderError('AMADEUS', `Authentication failed: ${response.statusText}`, {
          statusCode: response.status,
          isTransient: response.status >= 500,
        });
      }

      const tokenData = (await response.json()) as AmadeusOAuthTokenResponse;
      this.cachedToken = tokenData.access_token;
      this.tokenExpiresAt = Date.now() + tokenData.expires_in * 1000;

      Logger.info(`Acquired new Amadeus OAuth access token (valid ${tokenData.expires_in}s)`, 'AMADEUS_CLIENT');
      return this.cachedToken;
    } catch (err: unknown) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderUnavailableError('AMADEUS', `Failed to reach Amadeus authentication endpoint: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Searches flight offers via Amadeus /v2/shopping/flight-offers
   */
  async searchFlightOffers(
    params: {
      originLocationCode: string;
      destinationLocationCode: string;
      departureDate: string;
      returnDate?: string;
      adults: number;
      currencyCode?: string;
      nonStop?: boolean;
      max?: number;
    },
    signal?: AbortSignal
  ): Promise<AmadeusFlightOffersResponse> {
    const token = await this.getAccessToken(signal);

    const queryParams = new URLSearchParams({
      originLocationCode: params.originLocationCode,
      destinationLocationCode: params.destinationLocationCode,
      departureDate: params.departureDate,
      adults: String(params.adults || 1),
      currencyCode: params.currencyCode || 'INR',
      max: String(params.max || 10),
    });

    if (params.returnDate) {
      queryParams.set('returnDate', params.returnDate);
    }
    if (params.nonStop !== undefined) {
      queryParams.set('nonStop', String(params.nonStop));
    }

    const searchUrl = `${this.baseUrl}/v2/shopping/flight-offers?${queryParams.toString()}`;

    try {
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const seconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
        throw new ProviderRateLimitError('AMADEUS', seconds);
      }

      if (response.status === 401) {
        // Invalidate cached token so next request attempts re-auth
        this.cachedToken = null;
        this.tokenExpiresAt = 0;
        throw new ProviderError('AMADEUS', 'Unauthorized: Token expired or rejected by Amadeus', {
          statusCode: 401,
          isTransient: true,
        });
      }

      if (response.status >= 500) {
        const text = await response.text();
        throw new ProviderUnavailableError('AMADEUS', `Amadeus server error (${response.status}): ${text}`);
      }

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as AmadeusFlightOffersResponse;
        const detailMsg = errorBody.errors?.map((e) => `${e.title}: ${e.detail}`).join('; ') || response.statusText;
        throw new ProviderError('AMADEUS', `Search failed (${response.status}): ${detailMsg}`, {
          statusCode: response.status,
          isTransient: false,
        });
      }

      const data = (await response.json()) as AmadeusFlightOffersResponse;
      return data;
    } catch (err: unknown) {
      if (err instanceof ProviderError) throw err;
      if (signal?.aborted) {
        throw new ProviderTimeoutError('AMADEUS', this.timeoutMs);
      }
      throw new ProviderUnavailableError(
        'AMADEUS',
        `Network failure connecting to Amadeus flight offers endpoint: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Helper to resolve common Indian city names/codes to 3-letter IATA airport codes
   */
  static extractIataCode(input: string): string {
    const trimmed = input.trim();
    // Check if format contains "(DEL)"
    const match = trimmed.match(/\(([A-Z]{3})\)/i);
    if (match) {
      return match[1].toUpperCase();
    }

    // Direct 3-letter code
    if (/^[A-Z]{3}$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }

    const cityMap: Record<string, string> = {
      delhi: 'DEL',
      'new delhi': 'DEL',
      mumbai: 'BOM',
      bombay: 'BOM',
      bangalore: 'BLR',
      bengaluru: 'BLR',
      jaipur: 'JAI',
      goa: 'GOI',
      panaji: 'GOI',
      kolkata: 'CCU',
      calcutta: 'CCU',
      chennai: 'MAA',
      madras: 'MAA',
      hyderabad: 'HYD',
      kochi: 'COK',
      cochin: 'COK',
      ahmedabad: 'AMD',
      pune: 'PNQ',
      varanasi: 'VNS',
      kanpur: 'KNU',
      knu: 'KNU',
      amritsar: 'ATQ',
      lucknow: 'LKO',
      guwahati: 'GAU',
      srinagar: 'SXR',
    };

    const lower = trimmed.toLowerCase();
    for (const [cityName, code] of Object.entries(cityMap)) {
      if (lower.includes(cityName)) {
        return code;
      }
    }

    // Default fallback: first 3 characters uppercase
    return trimmed.substring(0, 3).toUpperCase();
  }

  /**
   * Parses ISO 8601 duration string (e.g. "PT1H10M" or "PT55M" or "PT2H") into integer minutes.
   */
  static parseIsoDurationToMinutes(durationStr: string): number {
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 60; // fallback standard 1 hour
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    return hours * 60 + minutes;
  }
}
