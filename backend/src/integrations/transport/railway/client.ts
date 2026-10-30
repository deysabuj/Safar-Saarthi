import {
  RailwayTrainBetweenStationsResponse,
} from './types.js';
import {
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderUnavailableError,
} from '../errors.js';
import { Logger } from '../../../utils/logger.js';
import { env } from '../../../config/env.js';

export interface RailwayClientConfig {
  apiKey?: string;
  apiUrl?: string;
  apiHost?: string;
  timeoutMs?: number;
}

export class RailwayClient {
  private apiKey?: string;
  private apiUrl: string;
  private apiHost: string;
  private timeoutMs: number;

  private static readonly STATION_CODE_MAP: Record<string, string> = {
    delhi: 'NDLS',
    'new delhi': 'NDLS',
    ndls: 'NDLS',
    dli: 'DLI',
    nzm: 'NZM',
    mumbai: 'CSMT',
    bombay: 'CSMT',
    csmt: 'CSMT',
    mmct: 'MMCT',
    bct: 'MMCT',
    bdts: 'BDTS',
    jaipur: 'JP',
    jp: 'JP',
    jai: 'JP',
    del: 'NDLS',
    bom: 'CSMT',
    blr: 'SBC',
    ccu: 'HWH',
    maa: 'MAS',
    hyd: 'HYB',
    pnq: 'PUNE',
    amd: 'ADI',
    vns: 'BSB',
    bangalore: 'SBC',
    bengaluru: 'SBC',
    sbc: 'SBC',
    ypr: 'YPR',
    kolkata: 'HWH',
    calcutta: 'HWH',
    hwh: 'HWH',
    sdah: 'SDAH',
    chennai: 'MAS',
    madras: 'MAS',
    mas: 'MAS',
    ms: 'MS',
    hyderabad: 'HYB',
    secunderabad: 'SC',
    sc: 'SC',
    hyb: 'HYB',
    kochi: 'ERS',
    cochin: 'ERS',
    ernakulam: 'ERS',
    ers: 'ERS',
    goa: 'MAO',
    madgaon: 'MAO',
    mao: 'MAO',
    ahmedabad: 'ADI',
    adi: 'ADI',
    pune: 'PUNE',
    varanasi: 'BSB',
    bsb: 'BSB',
    kanpur: 'CNB',
    'kanpur central': 'CNB',
    cnb: 'CNB',
    knu: 'CNB',
    agra: 'AGC',
    agc: 'AGC',
    lucknow: 'LKO',
    lko: 'LKO',
    amritsar: 'ASR',
    asr: 'ASR',
    chandigarh: 'CDG',
    cdg: 'CDG',
    bhopal: 'BPL',
    bpl: 'BPL',
    guwahati: 'GHY',
    ghy: 'GHY',
    patna: 'PNBE',
    pnbe: 'PNBE',
  };

  private static readonly STATION_NAME_MAP: Record<string, string> = {
    NDLS: 'New Delhi Railway Station',
    DLI: 'Old Delhi Junction',
    NZM: 'Hazrat Nizamuddin Railway Station',
    CSMT: 'Chhatrapati Shivaji Maharaj Terminus (Mumbai)',
    MMCT: 'Mumbai Central',
    BDTS: 'Bandra Terminus',
    JP: 'Jaipur Junction',
    SBC: 'KSR Bengaluru City Junction',
    YPR: 'Yesvantpur Junction',
    HWH: 'Howrah Junction (Kolkata)',
    SDAH: 'Sealdah (Kolkata)',
    MAS: 'Puratchi Thalaivar Dr. M.G. Ramachandran Central (Chennai)',
    SC: 'Secunderabad Junction',
    HYB: 'Hyderabad Deccan Nampally',
    ERS: 'Ernakulam Junction (Kochi)',
    MAO: 'Madgaon Junction (Goa)',
    ADI: 'Ahmedabad Junction',
    PUNE: 'Pune Junction',
    BSB: 'Varanasi Junction',
    CNB: 'Kanpur Central Railway Station',
    AGC: 'Agra Cantt',
    LKO: 'Lucknow Charbagh',
    ASR: 'Amritsar Junction',
    CDG: 'Chandigarh Junction',
  };

  constructor(config: RailwayClientConfig = {}) {
    this.apiKey = config.apiKey ?? env.IRCTC_API_KEY ?? process.env.IRCTC_API_KEY;
    this.apiUrl = config.apiUrl ?? env.IRCTC_API_URL ?? process.env.IRCTC_API_URL ?? 'https://irctc-indian-railway-pnr-status.p.rapidapi.com';
    this.apiHost = config.apiHost ?? env.IRCTC_API_HOST ?? process.env.IRCTC_API_HOST ?? 'irctc-indian-railway-pnr-status.p.rapidapi.com';
    this.timeoutMs = config.timeoutMs || 5000;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Resolves a city name, station code, or text string to a standard Indian Railways Station Code
   */
  static resolveStationCode(input: string): string {
    const trimmed = input.trim();

    // Check for parenthesized code like "New Delhi (NDLS)" or "New Delhi (DEL)"
    const match = trimmed.match(/\(([A-Z0-9]{2,5})\)/i);
    if (match) {
      const codeKey = match[1].toLowerCase();
      if (RailwayClient.STATION_CODE_MAP[codeKey]) {
        return RailwayClient.STATION_CODE_MAP[codeKey];
      }
      return match[1].toUpperCase();
    }

    // Direct station code (2-5 uppercase letters)
    if (/^[A-Z0-9]{2,5}$/i.test(trimmed)) {
      const upper = trimmed.toUpperCase();
      if (RailwayClient.STATION_CODE_MAP[trimmed.toLowerCase()]) {
        return RailwayClient.STATION_CODE_MAP[trimmed.toLowerCase()];
      }
      return upper;
    }

    const lower = trimmed.toLowerCase();
    for (const [key, code] of Object.entries(RailwayClient.STATION_CODE_MAP)) {
      if (lower.includes(key)) {
        return code;
      }
    }

    return trimmed.substring(0, 4).toUpperCase();
  }

  /**
   * Retrieves full readable station name for a code
   */
  static resolveStationName(code: string, cityFallback?: string): string {
    const upper = code.toUpperCase();
    if (RailwayClient.STATION_NAME_MAP[upper]) {
      return RailwayClient.STATION_NAME_MAP[upper];
    }
    return cityFallback ? `${cityFallback} Station (${upper})` : `Railway Station (${upper})`;
  }

  /**
   * Searches trains between stations via authorized API
   */
  async searchTrainsBetweenStations(
    params: {
      fromStationCode: string;
      toStationCode: string;
      dateOfJourney: string;
    },
    signal?: AbortSignal
  ): Promise<RailwayTrainBetweenStationsResponse> {
    if (!this.isConfigured()) {
      throw new ProviderError('IRCTC', 'Railway provider credentials (IRCTC_API_KEY) are not configured', {
        isTransient: false,
        statusCode: 401,
      });
    }

    const queryParams = new URLSearchParams({
      fromStationCode: params.fromStationCode,
      toStationCode: params.toStationCode,
      dateOfJourney: params.dateOfJourney,
    });

    const targetUrl = `${this.apiUrl}/trainsBetweenStations?${queryParams.toString()}`;

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': this.apiKey!,
          'x-rapidapi-host': this.apiHost,
          Accept: 'application/json',
        },
        signal,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const seconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
        throw new ProviderRateLimitError('IRCTC', seconds);
      }

      if (response.status === 401 || response.status === 403) {
        throw new ProviderError('IRCTC', `Authentication failed (${response.status}): Invalid Railway API key`, {
          statusCode: response.status,
          isTransient: false,
        });
      }

      if (response.status >= 500) {
        const errorText = await response.text();
        throw new ProviderUnavailableError('IRCTC', `Railway provider server error (${response.status}): ${errorText}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new ProviderError('IRCTC', `Railway search failed (${response.status}): ${errorText}`, {
          statusCode: response.status,
          isTransient: false,
        });
      }

      const data = (await response.json()) as RailwayTrainBetweenStationsResponse;
      return data;
    } catch (err: unknown) {
      if (err instanceof ProviderError) throw err;
      if (signal?.aborted) {
        throw new ProviderTimeoutError('IRCTC', this.timeoutMs);
      }
      throw new ProviderUnavailableError(
        'IRCTC',
        `Network failure connecting to Railway provider: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
