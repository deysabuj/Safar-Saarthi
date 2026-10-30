export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Authentication required', details?: unknown) {
    return new AppError(message, 401, 'UNAUTHORIZED', details);
  }

  static forbidden(message = 'Access forbidden', details?: unknown) {
    return new AppError(message, 403, 'FORBIDDEN', details);
  }

  static notFound(message: string, details?: unknown) {
    return new AppError(message, 404, 'NOT_FOUND', details);
  }

  static validation(message: string, details?: unknown) {
    return new AppError(message, 422, 'VALIDATION_ERROR', details);
  }

  static internal(message = 'An unexpected internal server error occurred', details?: unknown) {
    return new AppError(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}
