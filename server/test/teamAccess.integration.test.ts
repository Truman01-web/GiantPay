import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { MemoryRateLimitStore } from '../src/rateLimit.js';
import { tokenHash } from '../src/security.js';
import { apiKeyVerifier, generateApiKey } from '../src/developer/apiKeys.js';
import { encryptSecret } from '../src/developer/webhookSecurity.js';
import { totp } from '../src/team/security.js';
import { requireSafeTestDatabase } from './integrationGuard.js';
const url = process.env.TEST_DATABASE_URL
    ? requireSafeTestDatabase(
        process.env.TEST_DATABASE_URL,
        process.env.ALLOW_REMOTE_TEST_DATABASE === 'true',
      ).toString()
    : undefined,
  suite = url ? describe : describe.skip,
  schema = `team_test_${randomUUID().replaceAll('-', '')}`;
let admin: pg.Pool, db: pg.Pool, app: Awaited<ReturnType<typeof buildApp>>;
const headers = (token: string) => ({
  cookie: `giantpay_session=${token}; giantpay_csrf=c`,
  origin: 'http://127.0.0.1:5173',
  'x-csrf-token': 'c',
});
suite('team access database controls', () => {
  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: url! });
    await admin.query(`CREATE SCHEMA ${schema}`);
    db = new pg.Pool({ connectionString: url!, options: `-c search_path=${schema}` });
    for (const name of (await readdir(resolve('migrations')))
      .filter((x) => x.endsWith('.sql') && !x.startsWith('010_'))
      .sort())
      await db.query(await readFile(resolve('migrations', name), 'utf8'));
    await db.query(
      `INSERT INTO merchants(id,name) VALUES('m1','One'),('m2','Two');INSERT INTO users(id,merchant_id,name,email,password_hash,role,permissions) VALUES('u1','m1','One','one@test.invalid','x','OWNER','{}'),('u2','m2','Two','two@test.invalid','x','OWNER','{}'),('platform-admin',NULL,'Platform','platform@test.invalid','x','PLATFORM_ADMIN','{}')`,
    );
    await db.query(await readFile(resolve('migrations/010_team_access_security.sql'), 'utf8'));
    await db.query(
      `INSERT INTO users(id,merchant_id,name,email,normalized_email,password_hash,role,permissions,status) VALUES('invitee','m1','Invitee','invitee@test.invalid','invitee@test.invalid','x','VIEWER','{}','REMOVED')`,
    );
    const owner = (
      await db.query(
        `SELECT id FROM merchant_roles WHERE merchant_id='m1' AND normalized_name='owner'`,
      )
    ).rows[0];
    if (!owner) throw new Error('owner role missing');
    for (const [t, u] of [
      ['one-token', 'u1'],
      ['two-token', 'u2'],
    ] as const)
      await db.query(
        `INSERT INTO sessions(token_hash,user_id,expires_at,absolute_expires_at,last_seen_at) VALUES($1,$2,now()+interval '1 hour',now()+interval '2 hours',now())`,
        [tokenHash(t), u],
      );
    app = await buildApp(
      loadConfig({
        NODE_ENV: 'test',
        DATABASE_URL: url!,
        PASSWORD_PEPPER: 'p'.repeat(32),
        COOKIE_SECRET: 'c'.repeat(32),
        FRONTEND_ORIGIN: 'http://127.0.0.1:5173',
        PAYMENT_PROVIDER: 'sandbox',
        SANDBOX_WEBHOOK_SECRET: 'w'.repeat(32),
      }),
      db,
      undefined,
      undefined,
      new MemoryRateLimitStore(),
    );
  });
  afterAll(async () => {
    await app?.close();
    await db?.end();
    await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin?.end();
  });
  it('backfills six roles per merchant without assigning platform administrators', async () => {
    expect(
      Number(
        (
          await db.query(
            `SELECT count(*) FROM merchant_roles WHERE merchant_id='m1' AND system_role`,
          )
        ).rows[0].count,
      ),
    ).toBe(6);
    expect(
      Number(
        (await db.query(`SELECT count(*) FROM user_role_assignments WHERE user_id='u1'`)).rows[0]
          .count,
      ),
    ).toBe(1);
    expect(
      Number(
        (
          await db.query(
            `SELECT count(*) FROM user_role_assignments WHERE user_id='platform-admin'`,
          )
        ).rows[0].count,
      ),
    ).toBe(0);
  });
  it('isolates members and denies API keys through human-session guards', async () => {
    const own = await app.inject({ url: '/v1/team/members', headers: headers('one-token') });
    expect(own.statusCode, own.body).toBe(200);
    expect(own.json().data.every((x: any) => x.id !== 'u2')).toBe(true);
    expect(
      (await app.inject({ url: '/v1/team/members/u2', headers: headers('one-token') })).statusCode,
    ).toBe(404);
  });
  it('protects the final owner transactionally', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/team/members/u1/suspend',
      headers: headers('one-token'),
    });
    expect(response.statusCode, response.body).toBe(409);
    expect(response.json().error.code).toBe('FINAL_OWNER_PROTECTED');
    expect((await db.query(`SELECT status FROM users WHERE id='u1'`)).rows[0].status).toBe(
      'ACTIVE',
    );
  });
  it('rotates invitation tokens and accepts exactly once for the normalized identity', async () => {
    const role = (
        await db.query(
          `SELECT id FROM merchant_roles WHERE merchant_id='m1' AND normalized_name='viewer'`,
        )
      ).rows[0].id,
      created = await app.inject({
        method: 'POST',
        url: '/v1/team/invitations',
        headers: { ...headers('one-token'), 'content-type': 'application/json' },
        payload: { email: ' Invitee@Test.Invalid ', roleId: role },
      });
    expect(created.statusCode, created.body).toBe(201);
    const id = created.json().id,
      old = created.json().deliveryToken,
      resent = await app.inject({
        method: 'POST',
        url: `/v1/team/invitations/${id}/resend`,
        headers: headers('one-token'),
      });
    expect(resent.statusCode, resent.body).toBe(200);
    const token = resent.json().deliveryToken;
    expect(token).not.toBe(old);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/team/invitations/accept',
          headers: { 'content-type': 'application/json' },
          payload: { token: old, email: 'invitee@test.invalid' },
        })
      ).statusCode,
    ).toBe(404);
    const attempts = await Promise.all(
      [1, 2].map(() =>
        app.inject({
          method: 'POST',
          url: '/v1/team/invitations/accept',
          headers: { 'content-type': 'application/json' },
          payload: { token, email: 'INVITEE@test.invalid' },
        }),
      ),
    );
    expect(attempts.filter((x) => x.statusCode === 200)).toHaveLength(1);
    expect(attempts.filter((x) => x.statusCode === 409)).toHaveLength(1);
    expect((await db.query(`SELECT status FROM users WHERE id='invitee'`)).rows[0].status).toBe(
      'ACTIVE',
    );
  });
  it('protects system and assigned roles and archives an unused custom role', async () => {
    const system = (
      await db.query(
        `SELECT id FROM merchant_roles WHERE merchant_id='m1' AND normalized_name='viewer'`,
      )
    ).rows[0].id;
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/roles/${system}/archive`,
          headers: headers('one-token'),
        })
      ).statusCode,
    ).toBe(409);
    const made = await app.inject({
      method: 'POST',
      url: '/v1/roles',
      headers: { ...headers('one-token'), 'content-type': 'application/json' },
      payload: { name: 'Auditor', permissions: ['reports:read'] },
    });
    expect(made.statusCode, made.body).toBe(201);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/v1/roles/${made.json().id}`,
          headers: { ...headers('one-token'), 'content-type': 'application/json' },
          payload: { description: 'Read reports' },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/roles/${made.json().id}/archive`,
          headers: headers('one-token'),
        })
      ).statusCode,
    ).toBe(200);
  });
  it('rejects expired, cancelled, wrong-email, and cross-merchant invitations', async () => {
    const viewer1 = (
        await db.query(
          `SELECT id FROM merchant_roles WHERE merchant_id='m1' AND normalized_name='viewer'`,
        )
      ).rows[0].id,
      viewer2 = (
        await db.query(
          `SELECT id FROM merchant_roles WHERE merchant_id='m2' AND normalized_name='viewer'`,
        )
      ).rows[0].id;
    await db.query(
      `INSERT INTO users(id,merchant_id,name,email,normalized_email,password_hash,role,permissions,status) VALUES
       ('expired-user','m1','Expired','expired@test.invalid','expired@test.invalid','x','VIEWER','{}','REMOVED'),
       ('cancelled-user','m1','Cancelled','cancelled@test.invalid','cancelled@test.invalid','x','VIEWER','{}','REMOVED'),
       ('foreign-user','m2','Foreign','foreign@test.invalid','foreign@test.invalid','x','VIEWER','{}','REMOVED')`,
    );
    await db.query(
      `INSERT INTO team_invitations(id,merchant_id,normalized_email,role_id,status,invited_by,token_hash,expires_at,cancelled_at) VALUES
       ('expired-invite','m1','expired@test.invalid',$1,'PENDING','u1',$2,now()-interval '1 minute',NULL),
       ('cancelled-invite','m1','cancelled@test.invalid',$1,'CANCELLED','u1',$3,now()+interval '1 hour',now()),
       ('foreign-invite','m2','foreign@test.invalid',$4,'PENDING','u2',$5,now()+interval '1 hour',NULL)`,
      [viewer1, tokenHash('x'.repeat(32)), tokenHash('c'.repeat(32)), viewer2, tokenHash('f'.repeat(32))],
    );
    const accept = (token: string, email: string) =>
      app.inject({
        method: 'POST',
        url: '/v1/team/invitations/accept',
        headers: { 'content-type': 'application/json' },
        payload: { token, email },
      });
    expect((await accept('x'.repeat(32), 'expired@test.invalid')).statusCode).toBe(410);
    expect((await accept('c'.repeat(32), 'cancelled@test.invalid')).statusCode).toBe(409);
    expect((await accept('f'.repeat(32), 'wrong@test.invalid')).statusCode).toBe(403);
    expect((await accept('f'.repeat(32), 'foreign@test.invalid')).statusCode).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/team/invitations/foreign-invite/cancel',
          headers: headers('one-token'),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/v1/roles/${viewer2}`,
          headers: { ...headers('one-token'), 'content-type': 'application/json' },
          payload: { description: 'foreign' },
        })
      ).statusCode,
    ).toBe(404);
  });
  it('denies archival of an assigned custom role', async () => {
    const made = await app.inject({
      method: 'POST',
      url: '/v1/roles',
      headers: { ...headers('one-token'), 'content-type': 'application/json' },
      payload: { name: 'Assigned auditor', permissions: ['reports:read'] },
    });
    expect(made.statusCode, made.body).toBe(201);
    await db.query(
      `INSERT INTO users(id,merchant_id,name,email,normalized_email,password_hash,role,permissions) VALUES('assigned-user','m1','Assigned','assigned@test.invalid','assigned@test.invalid','x','VIEWER','{}')`,
    );
    await db.query(
      `INSERT INTO user_role_assignments(user_id,merchant_id,role_id,assigned_by) VALUES('assigned-user','m1',$1,'u1')`,
      [made.json().id],
    );
    const archived = await app.inject({
      method: 'POST',
      url: `/v1/roles/${made.json().id}/archive`,
      headers: headers('one-token'),
    });
    expect(archived.statusCode, archived.body).toBe(409);
    expect(archived.json().error.code).toBe('ROLE_STILL_ASSIGNED');
  });
  it('consumes a recovery code once, records audit evidence, and rejects expired challenges', async () => {
    const code = 'recovery-code-123',
      challenge = 'r'.repeat(32);
    await db.query(
      `INSERT INTO authentication_challenges(id,user_id,purpose,expires_at) VALUES($1,'u1','LOGIN',now()+interval '5 minutes')`,
      [tokenHash(challenge)],
    );
    await db.query(
      `INSERT INTO mfa_recovery_codes(id,user_id,code_hash) VALUES('recovery-one','u1',$1)`,
      [tokenHash(code)],
    );
    const attempts = await Promise.all(
      [1, 2].map(() =>
        app.inject({
          method: 'POST',
          url: '/v1/auth/mfa/recovery',
          headers: { 'content-type': 'application/json' },
          payload: { challengeId: challenge, recoveryCode: code },
        }),
      ),
    );
    expect(attempts.filter((x) => x.statusCode === 200), attempts.map((x) => x.body).join('\n')).toHaveLength(1);
    expect(attempts.filter((x) => x.statusCode === 401)).toHaveLength(1);
    expect(
      Number(
        (
          await db.query(
            `SELECT count(*) FROM audit_events WHERE action='MFA_RECOVERY_CODE_USED' AND actor_id='u1'`,
          )
        ).rows[0].count,
      ),
    ).toBe(1);
    const expired = 'e'.repeat(32);
    await db.query(
      `INSERT INTO authentication_challenges(id,user_id,purpose,expires_at) VALUES($1,'u1','LOGIN',now()-interval '1 second')`,
      [tokenHash(expired)],
    );
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/auth/mfa/recovery',
          headers: { 'content-type': 'application/json' },
          payload: { challengeId: expired, recoveryCode: 'unused-recovery-code' },
        })
      ).statusCode,
    ).toBe(401);
  });
  it('prevents TOTP replay and isolates and expires step-up verification by session', async () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
      code = totp(secret).code;
    await db.query(
      `INSERT INTO mfa_enrollments(user_id,secret_ciphertext,verified_at) VALUES('u1',$1,now()) ON CONFLICT(user_id) DO UPDATE SET verified_at=now(),last_counter=NULL`,
      [encryptSecret(secret, 'c'.repeat(32))],
    );
    await db.query(
      `INSERT INTO sessions(token_hash,public_id,user_id,expires_at,absolute_expires_at,last_seen_at) VALUES($1,'other-session','u1',now()+interval '1 hour',now()+interval '2 hours',now())`,
      [tokenHash('other-token')],
    );
    const verify = () =>
      app.inject({
        method: 'POST',
        url: '/v1/security/mfa/step-up',
        headers: { ...headers('one-token'), 'content-type': 'application/json' },
        payload: { code },
      });
    expect((await verify()).statusCode).toBe(200);
    expect((await verify()).statusCode).toBe(401);
    const sessions = await db.query(
      `SELECT public_id,mfa_verified_at FROM sessions WHERE user_id='u1' AND public_id IN ('other-session',(SELECT public_id FROM sessions WHERE token_hash=$1))`,
      [tokenHash('one-token')],
    );
    expect(sessions.rows.find((x) => x.public_id === 'other-session').mfa_verified_at).toBeNull();
    expect(sessions.rows.find((x) => x.public_id !== 'other-session').mfa_verified_at).not.toBeNull();
    await db.query(`UPDATE sessions SET mfa_verified_at=now()-interval '11 minutes' WHERE token_hash=$1`, [
      tokenHash('one-token'),
    ]);
    const expired = await app.inject({
      method: 'POST',
      url: '/v1/security/mfa/recovery-codes/regenerate',
      headers: headers('one-token'),
    });
    expect(expired.statusCode, expired.body).toBe(403);
    expect(expired.json().error.code).toBe('RECENT_MFA_REQUIRED');
  });
  it('denies API keys on every human-session-only Phase 5 route', async () => {
    const generated = generateApiKey();
    await db.query(
      `INSERT INTO api_keys(id,public_id,merchant_id,name,verifier,fingerprint,scopes,created_by) VALUES('phase5-key',$1,'m1','Phase 5',$2,$3,ARRAY['payments:read'],'u1')`,
      [generated.publicId, apiKeyVerifier(generated.plaintext, 'p'.repeat(32)), generated.fingerprint],
    );
    const cases: Array<[string, string, unknown?]> = [
      ['GET', '/v1/team/members'],
      ['GET', '/v1/team/members/u1'],
      ['PATCH', '/v1/team/members/u1/role', { roleId: 'none' }],
      ['POST', '/v1/team/members/u1/suspend'],
      ['POST', '/v1/team/members/u1/reactivate'],
      ['POST', '/v1/team/members/u1/remove'],
      ['GET', '/v1/team/invitations'],
      ['POST', '/v1/team/invitations', { email: 'api@test.invalid', roleId: 'none' }],
      ['POST', '/v1/team/invitations/none/cancel'],
      ['POST', '/v1/team/invitations/none/resend'],
      ['GET', '/v1/roles'],
      ['POST', '/v1/roles', { name: 'API role', permissions: [] }],
      ['PATCH', '/v1/roles/none', { description: 'x' }],
      ['POST', '/v1/roles/none/archive'],
      ['GET', '/v1/sessions'],
      ['DELETE', '/v1/sessions/none'],
      ['POST', '/v1/sessions/revoke-others'],
      ['POST', '/v1/security/mfa/enrollment'],
      ['POST', '/v1/security/mfa/enrollment/verify', { code: '000000' }],
      ['POST', '/v1/security/mfa/step-up', { code: '000000' }],
      ['POST', '/v1/security/mfa/recovery-codes/regenerate'],
      ['POST', '/v1/security/mfa/disable'],
    ];
    for (const [method, url, payload] of cases) {
      const response: any = await app.inject({
        method: method as any,
        url,
        headers: {
          authorization: `Bearer ${generated.plaintext}`,
          ...(payload === undefined ? {} : { 'content-type': 'application/json' }),
        },
        payload: payload as any,
      } as any);
      expect(response.statusCode, `${method} ${url}: ${response.body}`).toBe(403);
    }
  });
  it('records exact single-session and revoke-other-session audit counts', async () => {
    for (const [token, publicId] of [
      ['audit-session-one', 'audit-session-one'],
      ['audit-session-two', 'audit-session-two'],
    ] as const)
      await db.query(
        `INSERT INTO sessions(token_hash,public_id,user_id,expires_at,absolute_expires_at,last_seen_at) VALUES($1,$2,'u1',now()+interval '1 hour',now()+interval '2 hours',now())`,
        [tokenHash(token), publicId],
      );
    const single = await app.inject({
      method: 'DELETE',
      url: '/v1/sessions/audit-session-one',
      headers: headers('one-token'),
    });
    expect(single.statusCode, single.body).toBe(200);
    expect(
      Number(
        (
          await db.query(
            `SELECT count(*) FROM audit_events WHERE action='SESSION_REVOKED' AND resource_id='audit-session-one'`,
          )
        ).rows[0].count,
      ),
    ).toBe(1);
    const remaining = Number(
        (
          await db.query(
            `SELECT count(*) FROM sessions WHERE user_id='u1' AND token_hash<>$1 AND revoked_at IS NULL`,
            [tokenHash('one-token')],
          )
        ).rows[0].count,
      ),
      all = await app.inject({
        method: 'POST',
        url: '/v1/sessions/revoke-others',
        headers: headers('one-token'),
      });
    expect(all.statusCode, all.body).toBe(200);
    expect(all.json().revokedCount).toBe(remaining);
    const audit = (
      await db.query(
        `SELECT metadata FROM audit_events WHERE action='ALL_OTHER_SESSIONS_REVOKED' AND actor_id='u1' ORDER BY occurred_at DESC LIMIT 1`,
      )
    ).rows[0];
    expect(audit.metadata.revokedCount).toBe(remaining);
  });
  it('records password-reset session revocation evidence', async () => {
    const reset = 'password-reset-token-value-1234567890';
    await db.query(
      `UPDATE sessions SET revoked_at=NULL,expires_at=now()+interval '1 hour' WHERE token_hash=$1`,
      [tokenHash('one-token')],
    );
    await db.query(
      `INSERT INTO password_reset_requests(id,user_id,token_hash,expires_at) VALUES('reset-audit','u1',$1,now()+interval '5 minutes')`,
      [tokenHash(reset)],
    );
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/password/reset',
      headers: { 'content-type': 'application/json' },
      payload: { token: reset, password: 'A-new-safe-password-123!' },
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(
      Number(
        (await db.query(`SELECT count(*) FROM sessions WHERE user_id='u1' AND revoked_at IS NULL`))
          .rows[0].count,
      ),
    ).toBe(0);
    expect(
      Number(
        (
          await db.query(
            `SELECT count(*) FROM audit_events WHERE action='PASSWORD_RESET_COMPLETED' AND actor_id='u1'`,
          )
        ).rows[0].count,
      ),
    ).toBe(1);
    await db.query(
      `UPDATE sessions SET revoked_at=NULL,expires_at=now()+interval '1 hour' WHERE token_hash=$1`,
      [tokenHash('one-token')],
    );
  });
  it('rolls back invitation, role, session, and MFA state together on a protected-owner failure', async () => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO merchant_roles(id,merchant_id,name,normalized_name,permissions,created_by) VALUES('rollback-role','m1','Rollback','rollback',ARRAY[]::text[],'u1')`,
      );
      await client.query(
        `INSERT INTO team_invitations(id,merchant_id,normalized_email,role_id,invited_by,token_hash,expires_at) VALUES('rollback-invite','m1','rollback@test.invalid','rollback-role','u1',$1,now()+interval '1 hour')`,
        [tokenHash('rollback-token')],
      );
      await client.query(
        `INSERT INTO sessions(token_hash,public_id,user_id,expires_at,absolute_expires_at,last_seen_at) VALUES($1,'rollback-session','u1',now()+interval '1 hour',now()+interval '2 hours',now())`,
        [tokenHash('rollback-session-token')],
      );
      await client.query(
        `INSERT INTO mfa_enrollments(user_id,secret_ciphertext) VALUES('u1','rollback-secret') ON CONFLICT(user_id) DO UPDATE SET verified_at=NULL`,
      );
      await expect(client.query(`UPDATE users SET status='SUSPENDED' WHERE id='u1'`)).rejects.toThrow(
        /final owner/i,
      );
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    for (const [table, predicate] of [
      ['merchant_roles', `id='rollback-role'`],
      ['team_invitations', `id='rollback-invite'`],
      ['sessions', `public_id='rollback-session'`],
    ])
      expect(Number((await db.query(`SELECT count(*) FROM ${table} WHERE ${predicate}`)).rows[0].count)).toBe(0);
    expect((await db.query(`SELECT status FROM users WHERE id='u1'`)).rows[0].status).toBe('ACTIVE');
  });
  it('serializes concurrent final-owner mutations while legitimate mutation remains possible', async () => {
    const ownerRole = (
      await db.query(
        `SELECT id FROM merchant_roles WHERE merchant_id='m1' AND normalized_name='owner'`,
      )
    ).rows[0].id;
    await db.query(
      `INSERT INTO users(id,merchant_id,name,email,normalized_email,password_hash,role,permissions) VALUES('owner-b','m1','Owner B','owner-b@test.invalid','owner-b@test.invalid','x','OWNER','{}')`,
    );
    await db.query(
      `INSERT INTO user_role_assignments(user_id,merchant_id,role_id,assigned_by) VALUES('owner-b','m1',$1,'u1')`,
      [ownerRole],
    );
    const mutate = async (id: string) => {
        const client = await db.connect();
        try {
          await client.query('BEGIN');
          await client.query(`UPDATE users SET status='SUSPENDED' WHERE id=$1`, [id]);
          await client.query('COMMIT');
          return 'committed';
        } catch (error) {
          await client.query('ROLLBACK');
          if (!/final owner protected/i.test(String((error as Error).message))) throw error;
          return 'protected';
        } finally {
          client.release();
        }
      },
      results = await Promise.all([mutate('u1'), mutate('owner-b')]);
    expect(results.filter((x) => x === 'committed')).toHaveLength(1);
    expect(results.filter((x) => x === 'protected')).toHaveLength(1);
    expect(
      Number(
        (
          await db.query(
            `SELECT count(*) FROM users u JOIN user_role_assignments a ON a.user_id=u.id JOIN merchant_roles r ON r.id=a.role_id WHERE u.merchant_id='m1' AND u.status='ACTIVE' AND r.normalized_name='owner'`,
          )
        ).rows[0].count,
      ),
    ).toBe(1);
  });
  it('rejects direct SQL that would remove the final active owner', async () => {
    const activeOwner = (
      await db.query(
        `SELECT u.id FROM users u JOIN user_role_assignments a ON a.user_id=u.id JOIN merchant_roles r ON r.id=a.role_id WHERE u.merchant_id='m1' AND u.status='ACTIVE' AND r.normalized_name='owner'`,
      )
    ).rows[0].id;
    await expect(db.query(`UPDATE users SET status='SUSPENDED' WHERE id=$1`, [activeOwner])).rejects.toThrow(
      /final owner/i,
    );
    await expect(db.query(`DELETE FROM user_role_assignments WHERE user_id=$1`, [activeOwner])).rejects.toThrow(
      /final owner/i,
    );
    await expect(
      db.query(
        `UPDATE users SET status='SUSPENDED' WHERE id IN (SELECT a.user_id FROM user_role_assignments a JOIN merchant_roles r ON r.id=a.role_id WHERE a.merchant_id='m1' AND r.normalized_name='owner')`,
      ),
    ).rejects.toThrow(/final owner/i);
    expect(
      Number(
        (
          await db.query(
            `SELECT count(*) FROM users u JOIN user_role_assignments a ON a.user_id=u.id JOIN merchant_roles r ON r.id=a.role_id WHERE u.merchant_id='m1' AND u.status='ACTIVE' AND r.normalized_name='owner'`,
          )
        ).rows[0].count,
      ),
    ).toBe(1);
  });
});
