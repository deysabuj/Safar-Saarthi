import { TransportProvider, TransportQuery, NormalizedTransportOffer } from '../types.js';
import { ProviderTimeoutError, ProviderError } from '../errors.js';
import { Logger } from '../../../utils/logger.js';

export interface BaseAdapterOptions {
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
}

export abstract class BaseTransportAdapter implements TransportProvider {
  abstract readonly code: string;
  abstract readonly name: string;
  abstract readonly mode: 'FLIGHT' | 'TRAIN' | 'BUS';
  readonly isEnabled: boolean = true;

  protected readonly timeoutMs: number;
  protected readonly maxRetries: number;
  protected readonly retryBaseDelayMs: number;

  constructor(options: BaseAdapterOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 3500;
    this.maxRetries = options.maxRetries ?? 2;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 150;
  }

  /**
   * Protected abstract method implemented by specific provider adapters.
   */
  protected abstract executeSearch(query: TransportQuery): Promise<NormalizedTransportOffer[]>;

  /**
   * Public search entrypoint with timeout isolation, cancellation support, and transient retries.
   */
  async search(query: TransportQuery): Promise<NormalizedTransportOffer[]> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      // Check if external query has already been aborted
      if (query.signal?.aborted) {
        throw new ProviderError(this.code, 'Query execution was cancelled', { isTransient: false });
      }

      try {
        return await this.executeWithTimeout(query);
      } catch (err: unknown) {
        lastError = err;
        const isTransient = this.isTransientError(err);

        Logger.warn(
          `Provider '${this.code}' attempt ${attempt + 1}/${this.maxRetries + 1} failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
          'BASE_ADAPTER'
        );

        if (!isTransient || attempt === this.maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = this.retryBaseDelayMs * Math.pow(2, attempt) + Math.random() * 50;
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    if (lastError instanceof ProviderError) {
      throw lastError;
    }

    throw new ProviderError(
      this.code,
      lastError instanceof Error ? lastError.message : 'Unknown provider error occurred',
      { originalError: lastError, isTransient: this.isTransientError(lastError) }
    );
  }

  protected async executeWithTimeout(query: TransportQuery): Promise<NormalizedTransportOffer[]> {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), this.timeoutMs);

    // Merge external query signal with timeout signal
    const combinedSignal = query.signal
      ? this.linkAbortSignals(query.signal, timeoutController.signal)
      : timeoutController.signal;

    try {
      const scopedQuery = { ...query, signal: combinedSignal };
      const results = await this.executeSearch(scopedQuery);
      return results;
    } catch (err: unknown) {
      if (timeoutController.signal.aborted) {
        throw new ProviderTimeoutError(this.code, this.timeoutMs);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  protected isTransientError(err: unknown): boolean {
    if (err instanceof ProviderTimeoutError) return true;
    if (err instanceof ProviderError) return err.isTransient;
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      return (
        msg.includes('timeout') ||
        msg.includes('econnreset') ||
        msg.includes('etimedout') ||
        msg.includes('503') ||
        msg.includes('502') ||
        msg.includes('429')
      );
    }
    return false;
  }

  private linkAbortSignals(primary: AbortSignal, secondary: AbortSignal): AbortSignal {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (primary.aborted || secondary.aborted) {
      controller.abort();
      return controller.signal;
    }
    primary.addEventListener('abort', abort, { once: true });
    secondary.addEventListener('abort', abort, { once: true });
    return controller.signal;
  }
}
