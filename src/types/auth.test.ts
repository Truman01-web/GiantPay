import { describe, expect, it } from 'vitest';
import { hasAnyPermission, hasPermission, type Session } from './auth';

function makeSession(permissions: Session['user']['permissions']): Session {
  return {
    environment: 'sandbox',
    environments: ['sandbox'],
    user: {
      id: 'u1',
      name: 'Test User',
      email: 'test@example.mw',
      role: 'VIEWER',
      permissions,
      merchantId: 'm1',
      merchantName: 'Test Merchant',
      mfaEnabled: false,
    },
  };
}

describe('hasPermission', () => {
  it('returns false for a null session', () => {
    expect(hasPermission(null, 'payments:read')).toBe(false);
  });

  it('returns true only when the permission is present', () => {
    const session = makeSession(['payments:read']);
    expect(hasPermission(session, 'payments:read')).toBe(true);
    expect(hasPermission(session, 'payments.refunds:approve')).toBe(false);
  });
});

describe('hasAnyPermission', () => {
  it('returns true if at least one permission matches', () => {
    const session = makeSession(['settlements:read']);
    expect(hasAnyPermission(session, ['payments:read', 'settlements:read'])).toBe(true);
  });

  it('returns false if none match', () => {
    const session = makeSession(['settlements:read']);
    expect(hasAnyPermission(session, ['payments:read', 'reports:read'])).toBe(false);
  });
});
