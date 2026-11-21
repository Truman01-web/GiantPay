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

  it('validates a configured checkout origin for hosted and local frontends', () => {
    const api = 'https://api.example.test';
    expect(validateFrontendEnv({ VITE_API_URL: api, VITE_APP_ENV: 'sandbox', VITE_PUBLIC_CHECKOUT_ORIGIN: 'https://checkout.example.test/' }).publicCheckoutOrigin).toBe('https://checkout.example.test');
    expect(validateFrontendEnv({ VITE_API_URL: api, VITE_APP_ENV: 'development', VITE_PUBLIC_CHECKOUT_ORIGIN: 'http://127.0.0.1:4189' }).publicCheckoutOrigin).toBe('http://127.0.0.1:4189');
    for (const origin of ['https://user@example.test', 'https://example.test/path', 'https://example.test/?x=1', 'http://example.test']) {
      expect(() => validateFrontendEnv({ VITE_API_URL: api, VITE_PUBLIC_CHECKOUT_ORIGIN: origin })).toThrow();
    }
    expect(() => validateFrontendEnv({ VITE_API_URL: api, VITE_APP_ENV: 'sandbox', VITE_PUBLIC_CHECKOUT_ORIGIN: 'http://127.0.0.1:4189' })).toThrow(/HTTPS/);
  });

  it('requires an explicit valid portal context and forbids staff mocks',()=>{
    expect(validateFrontendEnv({VITE_API_URL:'https://api.giantpay.mw',VITE_PORTAL_CONTEXT:'staff'}).portalContext).toBe('staff');
    expect(()=>validateFrontendEnv({VITE_API_URL:'https://api.giantpay.mw',VITE_PORTAL_CONTEXT:'staff',VITE_USE_MOCK_API:'true'})).toThrow(/staff portal/i);
    expect(()=>validateFrontendEnv({VITE_API_URL:'https://api.giantpay.mw',VITE_PORTAL_CONTEXT:'administrator'})).toThrow(/merchant or staff/i);
  });
});
