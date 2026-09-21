import { describe, expect, it } from 'vitest';
import { ADMIN_NAV, MERCHANT_NAV } from './navigation';

describe('route navigation completeness', () => {
  it('contains the required merchant and administration destinations without broken anchors', () => {
    const merchant = MERCHANT_NAV.flatMap((group) => group.items.map((item) => item.to));
    const admin = ADMIN_NAV.flatMap((group) => group.items.map((item) => item.to));
    expect(merchant).toEqual(expect.arrayContaining(['/dashboard', '/onboarding', '/transactions', '/payment-links', '/refunds', '/settlements', '/reconciliation', '/reports', '/developers', '/team', '/roles', '/settings', '/support']));
    expect(admin).toEqual(expect.arrayContaining(['/admin', '/admin/merchant-applications', '/admin/merchants', '/admin/transactions', '/admin/refunds', '/admin/refunds/pending', '/admin/settlements', '/admin/reconciliation', '/admin/exceptions', '/admin/providers', '/admin/users', '/admin/roles', '/admin/audit-logs', '/admin/incidents', '/admin/security', '/admin/reports', '/admin/system-health', '/admin/settings']));
    expect([...merchant, ...admin].some((path) => path === '#' || !path.startsWith('/'))).toBe(false);
  });

  it('requires permissions for every non-dashboard operational navigation item', () => {
    const unguarded = [...MERCHANT_NAV, ...ADMIN_NAV].flatMap((group) => group.items).filter((item) => !['/dashboard'].includes(item.to) && !item.permission);
    expect(unguarded).toEqual([]);
  });
});
