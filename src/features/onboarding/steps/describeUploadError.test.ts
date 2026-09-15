import { describe, expect, it } from 'vitest';
import { ApiError } from '@/services/api/errors';
import { describeUploadError } from './describeUploadError';

function apiError(status: number, code = 'UNKNOWN_ERROR', message = 'raw backend message') {
  return new ApiError({ status, code, message });
}

describe('describeUploadError', () => {
  it('maps 413 to a file-too-large message', () => {
    expect(describeUploadError(apiError(413))).toMatch(/too large/i);
  });

  it('maps 415 to an unsupported-file message', () => {
    expect(describeUploadError(apiError(415))).toMatch(/not supported/i);
  });

  it('passes through the backend message for validation errors (400/422)', () => {
    expect(describeUploadError(apiError(422, 'VALIDATION', 'That document type is required.'))).toBe('That document type is required.');
  });

  it('maps 401 to a session-expired message', () => {
    expect(describeUploadError(apiError(401))).toMatch(/session has expired/i);
  });

  it('maps 403 to a permission message', () => {
    expect(describeUploadError(apiError(403))).toMatch(/permission/i);
  });

  it('maps 429 to a rate-limit message', () => {
    expect(describeUploadError(apiError(429))).toMatch(/too many attempts/i);
  });

  it('maps a NETWORK_ERROR code to a connectivity message', () => {
    expect(describeUploadError(apiError(0, 'NETWORK_ERROR'))).toMatch(/check your connection/i);
  });

  it('passes through the message for TIMEOUT and INVALID_RESPONSE codes', () => {
    expect(describeUploadError(apiError(0, 'TIMEOUT', 'The upload timed out.'))).toBe('The upload timed out.');
    expect(describeUploadError(apiError(0, 'INVALID_RESPONSE', 'The upload could not be confirmed.'))).toBe('The upload could not be confirmed.');
  });

  it('falls back to a safe generic message for a 500 and for non-ApiError values', () => {
    expect(describeUploadError(apiError(500))).toMatch(/couldn't upload the file/i);
    expect(describeUploadError(new Error('boom'))).toMatch(/couldn't upload the file/i);
    expect(describeUploadError('not even an error')).toMatch(/couldn't upload the file/i);
  });

  it('never leaks raw error internals into the message', () => {
    const raw = apiError(500, 'INTERNAL', 'SQLSTATE[42000] at /srv/app/db.js:412');
    expect(describeUploadError(raw)).not.toMatch(/SQLSTATE|\.js:|\/srv\//);
  });
});
