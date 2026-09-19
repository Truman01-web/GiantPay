import { env } from '@/app/config/env';
import { ApiError, GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE } from './errors';

export interface RequestOptions {
  signal?: AbortSignal;
  idempotencyKey?: string;
  timeoutMs?: number;
}

interface RawErrorBody {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
    requestId?: string;
    traceId?: string;
  };
}

let onUnauthorized: (() => void) | null = null;
let activeCsrfToken: string | null = null;

/** Registered once by the session provider so the client can react to a
 * lost/expired session globally without every call site handling it. */
export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export function setActiveCsrfToken(token: string | null): void {
  activeCsrfToken = token;
}

function getCsrfToken(): string | null {
  if (activeCsrfToken) return activeCsrfToken;
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)giantpay_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function buildHeaders(hasBody: boolean, options?: RequestOptions, method?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-Id': crypto.randomUUID(),
  };
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (options?.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
  if (method && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  return headers;
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let body: RawErrorBody = {};
  try {
    body = (await response.json()) as RawErrorBody;
  } catch {
    // Non-JSON error body — fall through to a generic message.
  }
  return new ApiError({
    status: response.status,
    code: body.error?.code ?? 'UNKNOWN_ERROR',
    message: body.error?.message ?? GENERIC_ERROR_MESSAGE,
    fields: body.error?.fields,
    requestId: body.error?.requestId ?? response.headers.get('x-request-id') ?? undefined,
    traceId: body.error?.traceId ?? response.headers.get('traceparent')?.split('-')[1] ?? undefined,
  });
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const url = `${env.apiUrl}/v1${path}`;
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(options?.signal?.reason);
  if (options?.signal?.aborted) abortFromCaller();
  else options?.signal?.addEventListener('abort', abortFromCaller, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options?.timeoutMs ?? 15_000);
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: buildHeaders(body !== undefined, options, method),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (cause) {
    if (timedOut) {
      throw new ApiError({ status: 0, code: 'TIMEOUT', message: 'The request timed out. Please try again.' });
    }
    if (options?.signal?.aborted) {
      throw cause;
    }
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: NETWORK_ERROR_MESSAGE });
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener('abort', abortFromCaller);
  }

  if (response.status === 401) {
    onUnauthorized?.();
    throw await parseErrorResponse(response);
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return undefined as T;
  }

  const data = (await response.json()) as T;
  if (data && typeof data === 'object' && 'csrfToken' in data) {
    const csrfToken = (data as { csrfToken?: unknown }).csrfToken;
    if (typeof csrfToken === 'string') setActiveCsrfToken(csrfToken);
  }
  return data;
}

/** Uploads have no inherent request/response size to reason about the way
 * JSON API calls do, and can run over slow mobile connections — bounded
 * generously so a real large-file upload isn't cut off, while still
 * guaranteeing the promise always settles instead of hanging forever on a
 * connection that silently stalls (see UPLOAD_TIMEOUT_MS usage below). */
const UPLOAD_TIMEOUT_MS = 60_000;

export const UPLOAD_TIMEOUT_MESSAGE = 'The upload timed out. Please check your connection and try again.';

/**
 * Multipart file upload with real upload-progress events, used by document
 * upload flows (onboarding KYC/KYB). Kept separate from `request` because
 * fetch cannot report upload progress and must not JSON-encode a
 * FormData body.
 */
function uploadFile<T>(
  path: string,
  form: FormData,
  options?: { signal?: AbortSignal; onProgress?: (percent: number) => void; timeoutMs?: number },
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (options?.signal?.aborted) {
      // `addEventListener('abort', ...)` below only ever fires for a
      // *future* abort — a signal already aborted before this promise was
      // created would otherwise be missed entirely and the upload would
      // proceed anyway.
      reject(new DOMException('The upload was cancelled.', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${env.apiUrl}/v1${path}`);
    xhr.withCredentials = true;
    const timeoutMs = options?.timeoutMs ?? UPLOAD_TIMEOUT_MS;
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader('X-Request-Id', crypto.randomUUID());
    const csrf = getCsrfToken();
    if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrf);

    // `xhr.timeout`/`ontimeout` and `xhr.abort()`/`onabort` are the
    // standard browser mechanism and are kept above as the primary path,
    // but nothing here relies on them exclusively — not every XHR
    // implementation enforces `.timeout` (browsers vary, and test/mock
    // environments commonly don't). An explicit timer is the only way to
    // *guarantee* this promise — and the caller's loading state — can
    // never hang past `timeoutMs`, or past an abort, regardless.
    let settled = false;
    function settleOnce(fn: () => void) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      fn();
    }
    const timeoutTimer = setTimeout(() => {
      xhr.abort();
      settleOnce(() => reject(new ApiError({ status: 0, code: 'TIMEOUT', message: UPLOAD_TIMEOUT_MESSAGE })));
    }, timeoutMs);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && options?.onProgress) {
        options.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      settleOnce(() => {
        const contentType = xhr.getResponseHeader('content-type') ?? '';
        let parsed: unknown;
        if (contentType.includes('application/json') && xhr.responseText) {
          try {
            parsed = JSON.parse(xhr.responseText);
          } catch {
            // A JSON content-type with an unparsable body is itself a
            // malformed response — never let this throw synchronously
            // here, which would leave the promise (and the caller's
            // loading state) unsettled forever. Treated as a normal API
            // error below.
            reject(new ApiError({ status: xhr.status, code: 'INVALID_RESPONSE', message: GENERIC_ERROR_MESSAGE }));
            return;
          }
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(parsed as T);
        } else {
          const body = parsed as RawErrorBody | undefined;
          if (xhr.status === 401) onUnauthorized?.();
          reject(
            new ApiError({
              status: xhr.status,
              code: body?.error?.code ?? 'UNKNOWN_ERROR',
              message: body?.error?.message ?? GENERIC_ERROR_MESSAGE,
              fields: body?.error?.fields,
              requestId: body?.error?.requestId,
            }),
          );
        }
      });
    };

    xhr.onerror = () => {
      settleOnce(() => reject(new ApiError({ status: 0, code: 'NETWORK_ERROR', message: NETWORK_ERROR_MESSAGE })));
    };

    xhr.ontimeout = () => {
      settleOnce(() => reject(new ApiError({ status: 0, code: 'TIMEOUT', message: UPLOAD_TIMEOUT_MESSAGE })));
    };

    // Mirrors how `request()` treats a fetch abort: reject with a plain
    // AbortError rather than an ApiError, so callers checking
    // `signal.aborted` can tell an intentional cancellation apart from a
    // real failure instead of showing a generic error message for it.
    xhr.onabort = () => {
      settleOnce(() => reject(new DOMException('The upload was cancelled.', 'AbortError')));
    };

    options?.signal?.addEventListener('abort', () => {
      xhr.abort();
      settleOnce(() => reject(new DOMException('The upload was cancelled.', 'AbortError')));
    });

    xhr.send(form);
  });
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
  uploadFile,
};

export const api = apiClient;
