import type { Db } from '../src/db.js';

/**
 * Upgrades explicitly-created legacy PLATFORM_ADMIN test rows into valid staff
 * identities. Production code never calls this helper.
 */
export async function provisionSyntheticStaff(db: Db) {
  await db.query(`
    UPDATE users
       SET email = id || '@giantplus-mw.com',
           normalized_email = id || '@giantplus-mw.com',
           email_verified_at = coalesce(email_verified_at, now()),
           mfa_enabled = true,
           staff_profile = CASE
             WHEN permissions && ARRAY['compliance:read','compliance:review','compliance:approve']::text[] THEN 'COMPLIANCE'
             WHEN permissions && ARRAY['platform.support.read','platform.support.reply','platform.support.assign','platform.support.manage']::text[] THEN 'SUPPORT'
             WHEN permissions && ARRAY['platform.settlements.read','platform.reconciliation.read','platform.refunds.read']::text[] THEN 'FINANCE'
             ELSE 'OPERATIONS'
           END,
           staff_provisioned_at = coalesce(staff_provisioned_at, now()),
           staff_provisioned_by = coalesce(staff_provisioned_by, 'synthetic-test-fixture')
     WHERE merchant_id IS NULL AND role = 'PLATFORM_ADMIN';

    INSERT INTO mfa_enrollments(user_id, secret_ciphertext, verified_at)
    SELECT id, 'synthetic-test-only-ciphertext', now()
      FROM users
     WHERE merchant_id IS NULL AND role = 'PLATFORM_ADMIN'
    ON CONFLICT (user_id) DO UPDATE SET verified_at = coalesce(mfa_enrollments.verified_at, excluded.verified_at);

    UPDATE sessions s
       SET session_context = 'STAFF', mfa_verified_at = coalesce(mfa_verified_at, now())
      FROM users u
     WHERE u.id = s.user_id AND u.merchant_id IS NULL AND u.role = 'PLATFORM_ADMIN';
  `);
}

const isSyntheticStaffToken = (token: string) =>
  !token.startsWith('merchant-') && /(^s\d|staff|security|platform|creator|proposer|checker|maker|limited|disabled|review|approve)/.test(token);

export const dualContextHeaders = (token: string, csrf = 'c') => ({
  cookie: `giantpay_session=${token}; giantpay_csrf=${csrf}; giantpay_staff_session=${token}; giantpay_staff_csrf=${csrf}`,
  origin: isSyntheticStaffToken(token) ? 'http://127.0.0.1:5174' : 'http://127.0.0.1:5173',
  'x-csrf-token': csrf,
});
