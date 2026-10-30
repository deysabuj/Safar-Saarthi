export interface ExchangeRateEntry {
  currency: string;
  rateToInr: number; // e.g. EUR = 90.50 means 1 EUR = 90.50 INR
  timestamp: string; // ISO 8601
  source: string;
}

export class CurrencyConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurrencyConversionError';
  }
}

export class CurrencyConverter {
  private rates = new Map<string, ExchangeRateEntry>();
  private maxStalenessHours: number;

  constructor(options: { maxStalenessHours?: number } = {}) {
    this.maxStalenessHours = options.maxStalenessHours ?? 720; // 30 days default

    // Standard official benchmark exchange rates (Indian Rupee base)
    const baseTimestamp = '2026-10-22T00:00:00Z';
    this.registerRate({ currency: 'INR', rateToInr: 1.0, timestamp: baseTimestamp, source: 'RBI Base' });
    this.registerRate({ currency: 'EUR', rateToInr: 91.25, timestamp: baseTimestamp, source: 'European Central Bank / RBI' });
    this.registerRate({ currency: 'USD', rateToInr: 84.40, timestamp: baseTimestamp, source: 'Federal Reserve / RBI' });
    this.registerRate({ currency: 'GBP', rateToInr: 109.80, timestamp: baseTimestamp, source: 'Bank of England / RBI' });
    this.registerRate({ currency: 'AED', rateToInr: 22.98, timestamp: baseTimestamp, source: 'Central Bank of UAE / RBI' });
    this.registerRate({ currency: 'SGD', rateToInr: 64.20, timestamp: baseTimestamp, source: 'MAS / RBI' });
  }

  registerRate(entry: ExchangeRateEntry): void {
    this.rates.set(entry.currency.toUpperCase(), {
      ...entry,
      currency: entry.currency.toUpperCase(),
    });
  }

  getRate(currency: string): ExchangeRateEntry | undefined {
    return this.rates.get(currency.toUpperCase());
  }

  /**
   * Converts an amount from source currency to INR.
   * Throws CurrencyConversionError if rate is missing or stale.
   */
  convertToInr(amount: number, fromCurrency: string, queryTimestamp?: string): {
    amountInInr: number;
    exchangeRate: number;
    rateTimestamp: string;
  } {
    const code = fromCurrency.toUpperCase();
    if (code === 'INR') {
      return {
        amountInInr: amount,
        exchangeRate: 1.0,
        rateTimestamp: new Date().toISOString(),
      };
    }

    const rateEntry = this.rates.get(code);
    if (!rateEntry) {
      throw new CurrencyConversionError(
        `Cannot compare currency ${code} without a verified exchange rate to INR.`
      );
    }

    // Check staleness against query timestamp or current time
    const now = queryTimestamp ? new Date(queryTimestamp).getTime() : Date.now();
    const rateTime = new Date(rateEntry.timestamp).getTime();
    const stalenessHours = (now - rateTime) / (1000 * 60 * 60);

    if (stalenessHours > this.maxStalenessHours) {
      throw new CurrencyConversionError(
        `Exchange rate for ${code} is stale (${Math.round(stalenessHours / 24)} days old). A fresh conversion rate is required.`
      );
    }

    const converted = Math.round(amount * rateEntry.rateToInr * 100) / 100;
    return {
      amountInInr: converted,
      exchangeRate: rateEntry.rateToInr,
      rateTimestamp: rateEntry.timestamp,
    };
  }
}

export const defaultCurrencyConverter = new CurrencyConverter();
