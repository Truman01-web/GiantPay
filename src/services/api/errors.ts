/**
 * Normalized frontend error shape. Every service call resolves to data or
 * rejects with an ApiError — components never branch on raw fetch/Response
 * objects, and never render a raw stack trace, SQL error, or provider
 * payload to a user.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields?: Record<string, string>;
  readonly requestId?: string;
  readonly traceId?: string;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    fields?: Record<string, string>;
    requestId?: string;
    traceId?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.fields = params.fields;
    this.requestId = params.requestId;
    this.traceId = params.traceId;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidation(): boolean {
    return this.status === 422 || this.status === 400;
  }

  get isPayloadTooLarge(): boolean {
    return this.status === 413;
  }

  get isUnsupportedMediaType(): boolean {
    return this.status === 415;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

/** Safe, user-facing fallback copy — never a raw technical message. */
export const GENERIC_ERROR_MESSAGE =
  'Something went wrong on our side. Please try again, or contact support if this continues.';

export const NETWORK_ERROR_MESSAGE =
  'We could not reach GiantPay. Check your connection and try again.';
