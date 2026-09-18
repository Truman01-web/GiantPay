import { describe, expect, it } from 'vitest';
import { validateFrontendEnv } from './env';

describe('frontend environment separation', () => {
  it('normalizes a real API origin', () => {
    expect(validateFrontendEnv({ VITE_API_URL: 'https://api.giantpay.mw/', VITE_APP_ENV: 'sandbox' }).apiUrl)
      .toBe('https://api.giantpay.mw');
  });

  it.each(['sandbox', 'staging', 'production'])('rejects mock mode in deployed %s mode', (appEnv) => {
    expect(() => validateFrontendEnv({ VITE_API_URL: 'https://api.giantpay.mw', VITE_APP_ENV: appEnv, VITE_USE_MOCK_API: 'true' }))
      .toThrow(/mock/i);
  });

  it('allows mocks only for local development and tests', () => {
    expect(validateFrontendEnv({ VITE_API_URL: 'http://localhost:4000', VITE_APP_ENV: 'development', VITE_USE_MOCK_API: 'true' }).useMockApi)
      .toBe(true);
  });

  it('fails clearly for a missing or unsafe API URL', () => {
    expect(() => validateFrontendEnv({ VITE_APP_ENV: 'sandbox' })).toThrow(/VITE_API_URL/);
    expect(() => validateFrontendEnv({ VITE_API_URL: 'https://user:secret@api.giantpay.mw' })).toThrow(/credential-free/);
  });
});
