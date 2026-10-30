export class ProviderError extends Error {
  public readonly providerCode: string;
  public readonly isTransient: boolean;
  public readonly statusCode?: number;
  public readonly originalError?: unknown;

  constructor(
    providerCode: string,
    message: string,
    options: {
      isTransient?: boolean;
      statusCode?: number;
      originalError?: unknown;
    } = {}
  ) {
    super(`[Provider:${providerCode}] ${message}`);
    this.name = 'ProviderError';
    this.providerCode = providerCode;
    this.isTransient = options.isTransient ?? false;
    this.statusCode = options.statusCode;
    this.originalError = options.originalError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(providerCode: string, timeoutMs: number) {
    super(providerCode, `Search request timed out after ${timeoutMs}ms`, {
      isTransient: true,
      statusCode: 504,
    });
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(providerCode: string, message = 'Provider service is temporarily unreachable') {
    super(providerCode, message, {
      isTransient: true,
      statusCode: 503,
    });
    this.name = 'ProviderUnavailableError';
  }
}

export class ProviderValidationError extends ProviderError {
  constructor(providerCode: string, details: string) {
    super(providerCode, `Failed to normalize or validate provider payload: ${details}`, {
      isTransient: false,
      statusCode: 422,
    });
    this.name = 'ProviderValidationError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(providerCode: string, retryAfterSeconds?: number) {
    super(
      providerCode,
      `Provider rate limit exceeded${retryAfterSeconds ? `. Retry after ${retryAfterSeconds}s` : ''}`,
      {
        isTransient: true,
        statusCode: 429,
      }
    );
    this.name = 'ProviderRateLimitError';
  }
}
