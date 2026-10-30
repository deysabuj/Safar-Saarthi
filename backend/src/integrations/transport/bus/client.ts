import {
  RedBusAvailableTripsResponse,
} from './types.js';
import {
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderUnavailableError,
} from '../errors.js';
import { Logger } from '../../../utils/logger.js';
import { env } from '../../../config/env.js';

export interface RedBusClientConfig {
  apiKey?: string;
  apiUrl?: string;
  timeoutMs?: number;
}

export class RedBusClient {
  private apiKey?: string;
  private apiUrl: string;
  private timeoutMs: number;

  private static readonly CITY_MAP: Record<string, { id: string; name: string }> = {
    delhi: { id: '130', name: 'Delhi' },
    'new delhi': { id: '130', name: 'Delhi' },
    jaipur: { id: '135', name: 'Jaipur' },
    mumbai: { id: '462', name: 'Mumbai' },
    bombay: { id: '462', name: 'Mumbai' },
    pune: { id: '138', name: 'Pune' },
    bangalore: { id: '122', name: 'Bangalore' },
    bengaluru: { id: '122', name: 'Bangalore' },
    chennai: { id: '123', name: 'Chennai' },
    hyderabad: { id: '124', name: 'Hyderabad' },
    ahmedabad: { id: '126', name: 'Ahmedabad' },
    agra: { id: '141', name: 'Agra' },
    chandigarh: { id: '142', name: 'Chandigarh' },
    lucknow: { id: '145', name: 'Lucknow' },
    kanpur: { id: '152', name: 'Kanpur' },
    cnb: { id: '152', name: 'Kanpur' },
    varanasi: { id: '150', name: 'Varanasi' },
    dehradun: { id: '155', name: 'Dehradun' },
    manali: { id: '160', name: 'Manali' },
    shimla: { id: '165', name: 'Shimla' },
    goa: { id: '210', name: 'Goa' },
    kolkata: { id: '128', name: 'Kolkata' },
    calcutta: { id: '128', name: 'Kolkata' },
    ccu: { id: '128', name: 'Kolkata' },
  };

  constructor(config: RedBusClientConfig = {}) {
    this.apiKey = config.apiKey ?? env.REDBUS_API_KEY ?? process.env.REDBUS_API_KEY;
    this.apiUrl = config.apiUrl ?? env.REDBUS_API_URL ?? process.env.REDBUS_API_URL ?? 'https://api.redbus.in/v1';
    this.timeoutMs = config.timeoutMs || 5000;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Resolves a city name or station string to standard RedBus city metadata
   */
  static resolveCity(input: string): { id: string; name: string } {
    const trimmed = input.trim().toLowerCase();

    for (const [key, city] of Object.entries(RedBusClient.CITY_MAP)) {
      if (trimmed.includes(key)) {
        return city;
      }
    }

    return {
      id: input.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
      name: input.split('(')[0].trim(),
    };
  }

  /**
   * Searches available intercity bus trips via RedBus API
   */
  async searchAvailableBuses(
    params: {
      sourceCity: string;
      destinationCity: string;
      doj: string; // Date of Journey: YYYY-MM-DD
    },
    signal?: AbortSignal
  ): Promise<RedBusAvailableTripsResponse> {
    if (!this.isConfigured()) {
      throw new ProviderError('REDBUS', 'RedBus provider credentials (REDBUS_API_KEY) are not configured', {
        isTransient: false,
        statusCode: 401,
      });
    }

    const source = RedBusClient.resolveCity(params.sourceCity);
    const destination = RedBusClient.resolveCity(params.destinationCity);

    const queryParams = new URLSearchParams({
      source: source.id,
      destination: destination.id,
      doj: params.doj,
    });

    const targetUrl = `${this.apiUrl}/availabletrips?${queryParams.toString()}`;

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey!,
          Accept: 'application/json',
        },
        signal,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const seconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
        throw new ProviderRateLimitError('REDBUS', seconds);
      }

      if (response.status === 401 || response.status === 403) {
        throw new ProviderError('REDBUS', `Authentication failed (${response.status}): Invalid RedBus API key`, {
          statusCode: response.status,
          isTransient: false,
        });
      }

      if (response.status >= 500) {
        const errorText = await response.text();
        throw new ProviderUnavailableError('REDBUS', `RedBus server error (${response.status}): ${errorText}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new ProviderError('REDBUS', `RedBus search failed (${response.status}): ${errorText}`, {
          statusCode: response.status,
          isTransient: false,
        });
      }

      const data = (await response.json()) as RedBusAvailableTripsResponse;
      return data;
    } catch (err: unknown) {
      if (err instanceof ProviderError) throw err;
      if (signal?.aborted) {
        throw new ProviderTimeoutError('REDBUS', this.timeoutMs);
      }
      throw new ProviderUnavailableError(
        'REDBUS',
        `Network failure connecting to RedBus provider: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
