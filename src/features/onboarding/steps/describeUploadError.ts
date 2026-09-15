import { ApiError } from '@/services/api/errors';

/** Safe, customer-facing copy for every way an upload can fail — never a
 * raw ApiError/XHR message. Backend validation (400/422) messages are
 * already written to be customer-safe (see services/api/errors.ts) and are
 * passed through as-is, matching this app's established error-display
 * convention elsewhere (e.g. LoginFlow). */
export function describeUploadError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isPayloadTooLarge) return 'The selected file is too large. Please choose a smaller file.';
    if (err.isUnsupportedMediaType) return 'The selected file is not supported.';
    if (err.isValidation) return err.message;
    if (err.isUnauthorized) return 'Your session has expired. Please sign in again.';
    if (err.isForbidden) return 'You do not have permission to upload this file.';
    if (err.isRateLimited) return 'Too many attempts. Please wait a moment and try again.';
    if (err.code === 'NETWORK_ERROR') return 'Unable to upload the file. Please check your connection and try again.';
    if (err.code === 'TIMEOUT' || err.code === 'INVALID_RESPONSE') return err.message;
  }
  return "We couldn't upload the file right now. Please try again later.";
}
