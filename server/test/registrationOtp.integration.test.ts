import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { MemoryRateLimitStore } from '../src/rateLimit.js';
import { TestRegistrationOtpDelivery } from '../src/registrationOtp.js';
import { requireSafeTestDatabase } from './integrationGuard.js';

const url = process.env.TEST_DATABASE_URL
  ? requireSafeTestDatabase(
      process.env.TEST_DATABASE_URL,
      process.env.ALLOW_REMOTE_TEST_DATABASE === 'true',
    ).toString()
  : undefined;
const suite = url ? describe : describe.skip,
  schema = `registration_otp_${randomUUID().replaceAll('-', '')}`;
let admin: pg.Pool, db: pg.Pool, app: Awaited<ReturnType<typeof buildApp>>;
const delivery = new TestRegistrationOtpDelivery();
const registration = (email: string) => ({
  businessName: 'OTP Test Merchant',
  email,
  password: 'correct horse battery',
  phone: '+265999000001',
});

suite('registration email OTP lifecycle', () => {
  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: url! });
    await admin.query(`CREATE SCHEMA ${schema}`);
    db = new pg.Pool({ connectionString: url!, options: `-c search_path=${schema}` });
    for (const name of (await readdir(resolve('migrations')))
      .filter((x) => x.endsWith('.sql'))
      .sort())
      await db.query(await readFile(resolve('migrations', name), 'utf8'));
    const config = loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: url!,
      PASSWORD_PEPPER: 'p'.repeat(32),
      COOKIE_SECRET: 'c'.repeat(32),
      FRONTEND_ORIGIN: 'http://127.0.0.1:5173',
      PAYMENT_PROVIDER: 'sandbox',
      SANDBOX_WEBHOOK_SECRET: 'w'.repeat(32),
    });
    app = await buildApp(config, db, undefined, undefined, new MemoryRateLimitStore(), delivery);
  });
  afterAll(async () => {
    await app?.close();
    await db?.end();
    await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin?.end();
  });

  it('stores only an HMAC, returns no code, blocks login, verifies once, then permits login', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: registration('otp-one@example.invalid'),
    });
    expect(response.statusCode, response.body).toBe(202);
    expect(response.body).not.toContain(delivery.messages[0]!.code);
    expect(response.json().delivery).toEqual({ available: true, queued: true });
    const message = delivery.messages[0]!;
    const stored = (
      await db.query('SELECT * FROM registration_email_challenges WHERE id=$1', [
        message.challengeId,
      ])
    ).rows[0];
    expect(stored.otp_hmac).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(message.code);
    expect(stored.expires_at.getTime() - stored.created_at.getTime()).toBeGreaterThanOrEqual(
      599_000,
    );
    expect(stored.expires_at.getTime() - stored.created_at.getTime()).toBeLessThanOrEqual(600_000);
    const login = () =>
      app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'otp-one@example.invalid', password: 'correct horse battery' },
      });
    expect((await login()).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/auth/registration/verify',
          payload: { challengeId: message.challengeId, code: message.code },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/auth/registration/verify',
          payload: { challengeId: message.challengeId, code: message.code },
        })
      ).json().error.code,
    ).toBe('REGISTRATION_OTP_REUSED');
    expect((await login()).statusCode).toBe(200);
  });

  it('rejects invalid and expired codes and exhausts exactly five attempts', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: registration('otp-two@example.invalid'),
    });
    const first = delivery.messages.at(-1)!;
    const invalid = await app.inject({
      method: 'POST',
      url: '/v1/auth/registration/verify',
      payload: { challengeId: first.challengeId, code: '111111' },
    });
    expect(invalid.json().error.code, invalid.body).toBe('REGISTRATION_OTP_INVALID');
    await db.query(
      'ALTER TABLE registration_email_challenges DISABLE TRIGGER registration_challenge_secret_guard',
    );
    await db.query(
      `UPDATE registration_email_challenges SET expires_at=now()-interval '1 second' WHERE id=$1`,
      [first.challengeId],
    );
    await db.query(
      'ALTER TABLE registration_email_challenges ENABLE TRIGGER registration_challenge_secret_guard',
    );
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/auth/registration/verify',
          payload: { challengeId: first.challengeId, code: first.code },
        })
      ).json().error.code,
    ).toBe('REGISTRATION_OTP_EXPIRED');
    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: registration('otp-three@example.invalid'),
    });
    const second = delivery.messages.at(-1)!;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/registration/verify',
        payload: { challengeId: second.challengeId, code: '222222' },
      });
      expect(response.statusCode).toBe(attempt === 5 ? 429 : 401);
    }
    expect(
      Number(
        (
          await db.query('SELECT attempt_count FROM registration_email_challenges WHERE id=$1', [
            second.challengeId,
          ])
        ).rows[0].attempt_count,
      ),
    ).toBe(5);
  });

  it('enforces resend cooldown and invalidates the previous code', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: registration('otp-four@example.invalid'),
    });
    const old = delivery.messages.at(-1)!;
    const cooldown = await app.inject({
      method: 'POST',
      url: '/v1/auth/registration/resend',
      payload: { challengeId: old.challengeId },
    });
    expect(cooldown.statusCode).toBe(429);
    expect(cooldown.json().error.code).toBe('REGISTRATION_OTP_RESEND_COOLDOWN');
    await db.query(
      `UPDATE registration_email_challenges SET resend_available_at=now()-interval '1 second' WHERE id=$1`,
      [old.challengeId],
    );
    const resent = await app.inject({
      method: 'POST',
      url: '/v1/auth/registration/resend',
      payload: { challengeId: old.challengeId },
    });
    expect(resent.statusCode, resent.body).toBe(202);
    const next = delivery.messages.at(-1)!;
    expect(next.challengeId).not.toBe(old.challengeId);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/auth/registration/verify',
          payload: { challengeId: old.challengeId, code: old.code },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/auth/registration/verify',
          payload: { challengeId: next.challengeId, code: next.code },
        })
      ).statusCode,
    ).toBe(200);
  });

  it('uses generic anti-enumeration registration responses for existing destinations', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: registration('otp-four@example.invalid'),
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      accepted: true,
      verificationRequired: true,
      delivery: { available: false, queued: false },
    });
    expect(
      delivery.messages.filter((x) => x.destination === 'otp-four@example.invalid'),
    ).toHaveLength(2);
  });
});
