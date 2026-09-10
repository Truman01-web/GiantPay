import { env } from '@/app/config/env';
import { ApiError, GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE } from './errors';

export interface RequestOptions {
  signal?: AbortSignal;
  idempotencyKey?: string;
}

interface RawErrorBody {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
    requestId?: string;
  };
}

let onUnauthorized: (() => void) | null = null;

/** Registered once by the session provider so the client can react to a
 * lost/expired session globally without every call site handling it. */
export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

function buildHeaders(hasBody: boolean, options?: RequestOptions): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-Id': crypto.randomUUID(),
  };
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (options?.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
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
  });
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const url = `${env.apiUrl}/v1${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: buildHeaders(body !== undefined, options),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });
  } catch (cause) {
    if (options?.signal?.aborted) {
      throw cause;
    }
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: NETWORK_ERROR_MESSAGE });
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

  return (await response.json()) as T;
}

/**
 * Multipart file upload with real upload-progress events, used by document
 * upload flows (onboarding KYC/KYB). Kept separate from `request` because
 * fetch cannot report upload progress and must not JSON-encode a
 * FormData body.
 */
function uploadFile<T>(
  path: string,
  form: FormData,
  options?: { signal?: AbortSignal; onProgress?: (percent: number) => void },
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${env.apiUrl}/v1${path}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('X-Request-Id', crypto.randomUUID());

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && options?.onProgress) {
        options.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader('content-type') ?? '';
      const parsed = contentType.includes('application/json') && xhr.responseText
        ? JSON.parse(xhr.responseText)
        : undefined;
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
    };

    xhr.onerror = () => {
      reject(new ApiError({ status: 0, code: 'NETWORK_ERROR', message: NETWORK_ERROR_MESSAGE }));
    };

    options?.signal?.addEventListener('abort', () => xhr.abort());

    xhr.send(form);
  });
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
  uploadFile,
};
