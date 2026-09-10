import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safeRedirect';

describe('safeRedirectPath', () => {
  it('allows a relative path', () => {
    expect(safeRedirectPath('/transactions/123')).toBe('/transactions/123');
  });

  it('preserves query and hash', () => {
    expect(safeRedirectPath('/transactions?status=FAILED#top')).toBe('/transactions?status=FAILED#top');
  });

  it('falls back on an absolute URL to another origin', () => {
    expect(safeRedirectPath('https://evil.example.com/phish')).toBe('/');
  });

  it('falls back on a protocol-relative URL (open-redirect vector)', () => {
    expect(safeRedirectPath('//evil.example.com')).toBe('/');
  });

  it('falls back on empty or missing input', () => {
    expect(safeRedirectPath(null)).toBe('/');
    expect(safeRedirectPath(undefined, '/dashboard')).toBe('/dashboard');
  });

  it('falls back on a path not starting with /', () => {
    expect(safeRedirectPath('dashboard')).toBe('/');
  });
});
