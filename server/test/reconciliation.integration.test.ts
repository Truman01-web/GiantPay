import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { transaction } from '../src/db.js';
import { apiKeyVerifier, generateApiKey } from '../src/developer/apiKeys.js';
import { postSuccessfulPayment } from '../src/ledger/ledgerService.js';
import { tokenHash } from '../src/security.js';
import { requireSafeTestDatabase } from './integrationGuard.js';

const url = process.env.TEST_DATABASE_URL
  ? requireSafeTestDatabase(
      process.env.TEST_DATABASE_URL,
      process.env.ALLOW_REMOTE_TEST_DATABASE === 'true',
    ).toString()
  : undefined;
const suite = url ? describe : describe.skip,
  schema = `reconciliation_test_${randomUUID().replaceAll('-', '')}`;
const start = '2026-09-01T00:00:00.000Z',
  end = '2026-09-02T00:00:00.000Z',
  permissions = [
    'reconciliation:read',
    'reconciliation:manage',
    'reconciliation:approve',
    'ledger:integrity',
    'settlements:read',
    'settlements:manage',
    'settlements:approve',
  ];
let admin: pg.Pool, db: pg.Pool, app: Awaited<ReturnType<typeof buildApp>>;
const session = (token: string, csrf = 'csrf') => ({
  cookie: `giantpay_session=${token}; giantpay_csrf=${csrf}`,
  origin: 'http://127.0.0.1:5173',
  'x-csrf-token': csrf,
});
const json = (token: string, key: string, payload: any) => ({
  method: 'POST' as const,
  headers: { ...session(token), 'content-type': 'application/json', 'idempotency-key': key },
  payload,
});
const insertRun = async (id: string, merchant = 'm1', unmatched = 0, status = 'COMPLETED') =>
  db.query(
    `INSERT INTO reconciliation_runs(id,merchant_id,reconciliation_type,provider,environment,currency,period_start,period_end,status,source_count,matched_count,unmatched_count,config_snapshot,source_sha256,initiated_by,completed_at) VALUES($1,$2,'PAYMENTS','sandbox','sandbox','MWK',$3,$4,$5,1,$6,$7,'{}',$8,$9,CASE WHEN $5='COMPLETED' THEN now() END)`,
    [
      id,
      merchant,
      start,
      end,
      status,
      unmatched ? 0 : 1,
      unmatched,
      'a'.repeat(64),
      merchant === 'm1' ? 'maker' : 'other',
    ],
  );
const insertException = async (id: string, run = 'run1', merchant = 'm1') =>
  db.query(
    `INSERT INTO reconciliation_exceptions(id,run_id,merchant_id,classification,source_reference,evidence,evidence_sha256) VALUES($1,$2,$3,'AMOUNT_MISMATCH',$1,'{}',$4)`,
    [id, run, merchant, 'b'.repeat(64)],
  );
const insertPayment = async (id = 'pay1', gross = 1000, fee = 20, merchant = 'm1') =>
  db.query(
    `INSERT INTO payments(id,merchant_id,reference,status,channel,gross_minor,fee_minor,currency,updated_at) VALUES($1,$2,$3,'SUCCEEDED','CARD',$4,$5,'MWK',$6)`,
    [id, merchant, `REF-${id}`, gross, fee, start],
  );

suite('reconciliation and sandbox settlement database controls', () => {
  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: url! });
    await admin.query(`CREATE SCHEMA ${schema}`);
    db = new pg.Pool({ connectionString: url!, options: `-c search_path=${schema}` });
    const migrations = (await readdir(resolve('migrations')))
      .filter((x) => x.endsWith('.sql'))
      .sort();
    for (const name of migrations.filter((x) => !x.startsWith('008_')))
      await db.query(await readFile(resolve('migrations', name), 'utf8'));
    await db.query(
      `INSERT INTO merchants(id,name) VALUES('m1','One'),('m2','Two');INSERT INTO users(id,merchant_id,name,email,password_hash,role,permissions) VALUES('maker','m1','Maker','maker@example.invalid','x','OWNER','{}'),('viewer','m1','Viewer','viewer@example.invalid','x','ANALYST','{}'),('other','m2','Other','other@example.invalid','x','OWNER','{}')`,
    );
    await db.query(await readFile(resolve('migrations/008_reconciliation_settlement.sql'), 'utf8'));
    await db.query(
      `INSERT INTO users(id,merchant_id,name,email,password_hash,role,permissions) VALUES('checker','m1','Checker','checker@example.invalid','x','OWNER',$1)`,
      [permissions],
    );
    for (const [token, user] of [
      ['maker-token', 'maker'],
      ['checker-token', 'checker'],
      ['viewer-token', 'viewer'],
      ['other-token', 'other'],
    ] as const)
      await db.query(
        `INSERT INTO sessions(token_hash,user_id,expires_at,absolute_expires_at,last_seen_at) VALUES($1,$2,now()+interval '1 hour',now()+interval '2 hours',now())`,
        [tokenHash(token), user],
      );
    const config = loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: url!,
      PASSWORD_PEPPER: 'p'.repeat(32),
      COOKIE_SECRET: 'c'.repeat(32),
      FRONTEND_ORIGIN: 'http://127.0.0.1:5173',
      PAYMENT_PROVIDER: 'sandbox',
      SANDBOX_WEBHOOK_SECRET: 'w'.repeat(32),
    });
    app = await buildApp(config, db);
  });
  afterAll(async () => {
    await app?.close();
    await db?.end();
    await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin?.end();
  });
  beforeEach(async () => {
    await db.query(
      'TRUNCATE settlement_exports,settlement_batches,compensating_adjustments,reconciliation_exception_events,reconciliation_exceptions,reconciliation_runs,outbox_events,journal_postings,journal_entries,ledger_accounts,refunds,payment_attempts,payments CASCADE',
    );
  });

  it('registers migration 008 objects, constraints, indexes, foreign keys and immutability triggers', async () => {
    const tables = await db.query(
      `SELECT tablename FROM pg_tables WHERE schemaname=$1 AND tablename IN ('reconciliation_runs','reconciliation_exceptions','reconciliation_exception_events','compensating_adjustments','settlement_batches','settlement_exports')`,
      [schema],
    );
    expect(tables.rowCount).toBe(6);
    const indexes = await db.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname=$1 AND indexname IN ('reconciliation_runs_merchant_idx','reconciliation_exceptions_merchant_idx','settlement_batches_merchant_idx')`,
      [schema],
    );
    expect(indexes.rowCount).toBe(3);
    const triggers = await db.query(
      `SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'reconciliation_%' OR tgname='settlement_calculation_immutable'`,
    );
    expect(triggers.rows.map((x) => x.tgname)).toEqual(
      expect.arrayContaining([
        'reconciliation_runs_source_immutable',
        'reconciliation_exception_evidence_immutable',
        'reconciliation_exception_transition_valid',
        'settlement_calculation_immutable',
      ]),
    );
    expect(
      (
        await db.query(
          `SELECT count(*)::int count FROM information_schema.table_constraints WHERE constraint_schema=$1 AND constraint_type='FOREIGN KEY' AND table_name IN ('reconciliation_runs','reconciliation_exceptions','compensating_adjustments','settlement_batches','settlement_exports')`,
          [schema],
        )
      ).rows[0].count,
    ).toBeGreaterThanOrEqual(10);
  });

  it('grants Phase 3 permissions only to pre-existing OWNER roles', async () => {
    const rows = await db.query(
        `SELECT id,permissions FROM users WHERE id IN ('maker','viewer','other') ORDER BY id`,
      ),
      byId = Object.fromEntries(rows.rows.map((x) => [x.id, x.permissions]));
    expect(byId.maker).toEqual(expect.arrayContaining(permissions));
    expect(byId.other).toEqual(expect.arrayContaining(permissions));
    expect(byId.viewer).not.toContain('reconciliation:read');
  });

  it('isolates runs, exceptions, events, adjustments, settlements and exports by merchant', async () => {
    await insertRun('run2', 'm2');
    await insertException('ex2', 'run2', 'm2');
    await db.query(
      `INSERT INTO reconciliation_exception_events(id,exception_id,merchant_id,actor_id,to_status,idempotency_key) VALUES('evt2','ex2','m2','other','UNDER_REVIEW','other-event')`,
    );
    await db.query(
      `INSERT INTO settlement_batches(id,merchant_id,currency,period_start,period_end,gross_minor,refunds_minor,fees_minor,net_minor,input_snapshot,input_sha256,created_by,idempotency_key) VALUES('set2','m2','MWK',$1,$2,100,0,0,100,'{}',$3,'other','other-settlement')`,
      [start, end, 'c'.repeat(64)],
    );
    await db.query(
      `INSERT INTO settlement_exports(id,batch_id,merchant_id,filename,content_sha256,created_by) VALUES('export2','set2','m2','sandbox.csv',$1,'other')`,
      ['d'.repeat(64)],
    );
    const runs = await app.inject({
        url: '/v1/reconciliation/runs',
        headers: session('maker-token'),
      }),
      exceptions = await app.inject({
        url: '/v1/reconciliation/exceptions',
        headers: session('maker-token'),
      }),
      settlements = await app.inject({ url: '/v1/settlements', headers: session('maker-token') });
    expect(runs.json().data).toHaveLength(0);
    expect(exceptions.json().data).toHaveLength(0);
    expect(settlements.json().data).toHaveLength(0);
    for (const path of [
      '/v1/reconciliation/runs/run2',
      '/v1/reconciliation/exceptions/ex2',
      '/v1/settlements/set2',
    ])
      expect((await app.inject({ url: path, headers: session('maker-token') })).statusCode).toBe(
        404,
      );
    expect(
      (
        await app.inject({
          ...json('maker-token', 'foreign-review', { status: 'UNDER_REVIEW' }),
          url: '/v1/reconciliation/exceptions/ex2/review',
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          ...json('maker-token', 'foreign-export', {}),
          url: '/v1/settlements/set2/export',
        })
      ).statusCode,
    ).toBe(404);
    expect(
      Number(
        (
          await db.query(
            `SELECT count(*) FROM reconciliation_exception_events WHERE merchant_id='m1' OR exception_id='ex2' AND merchant_id='m1'`,
          )
        ).rows[0].count,
      ),
    ).toBe(0);
  });

  it('makes reconciliation retries and concurrent scope creation single-winner and period-bound', async () => {
    const body = { type: 'PAYMENTS', currency: 'MWK', periodStart: start, periodEnd: end };
    const requests = ['reconcile-a', 'reconcile-b'].map((key) =>
      app.inject({ ...json('maker-token', key, body), url: '/v1/reconciliation/runs' }),
    );
    const responses = await Promise.all(requests);
    expect(responses.every((x) => [200, 201].includes(x.statusCode))).toBe(true);
    expect(new Set(responses.map((x) => x.json().id)).size).toBe(1);
    expect(Number((await db.query('SELECT count(*) FROM reconciliation_runs')).rows[0].count)).toBe(
      1,
    );
    expect(
      Number(
        (
          await db.query(
            `SELECT count(*) FROM audit_events WHERE action='RECONCILIATION_COMPLETED'`,
          )
        ).rows[0].count,
      ),
    ).toBe(1);
    expect(
      Number((await db.query('SELECT count(*) FROM reconciliation_exceptions')).rows[0].count),
    ).toBe(0);
    expect(Number((await db.query('SELECT count(*) FROM outbox_events')).rows[0].count)).toBe(0);
    const retry = await app.inject({
      ...json('maker-token', 'reconcile-c', body),
      url: '/v1/reconciliation/runs',
    });
    expect(retry.json().id).toBe(responses[0]!.json().id);
  });

  it('enforces exception lifecycle, terminal immutability, idempotency and concurrent single resolution', async () => {
    await insertRun('run1');
    await insertException('ex1');
    expect(
      (
        await app.inject({
          ...json('maker-token', 'invalid-direct', {
            status: 'RESOLVED',
            reason: 'Reviewed',
            evidenceRef: 'case-1',
          }),
          url: '/v1/reconciliation/exceptions/ex1/review',
        })
      ).statusCode,
    ).toBe(409);
    const under = {
      ...json('maker-token', 'claim-one', { status: 'UNDER_REVIEW' }),
      url: '/v1/reconciliation/exceptions/ex1/review',
    };
    expect((await app.inject(under)).statusCode).toBe(200);
    expect((await app.inject(under)).statusCode).toBe(200);
    const outcomes = await Promise.all(
      [
        { status: 'RESOLVED', reason: 'Matched evidence', evidenceRef: 'case-2' },
        { status: 'DISMISSED', reason: 'False positive', evidenceRef: 'case-3' },
      ].map((payload, i) =>
        app.inject({
          ...json('checker-token', `resolve-${i}`, payload),
          url: '/v1/reconciliation/exceptions/ex1/review',
        }),
      ),
    );
    expect(outcomes.filter((x) => x.statusCode === 200)).toHaveLength(1);
    expect(outcomes.filter((x) => x.statusCode === 409)).toHaveLength(1);
    expect(
      Number(
        (
          await db.query(
            `SELECT count(*) FROM reconciliation_exception_events WHERE exception_id='ex1'`,
          )
        ).rows[0].count,
      ),
    ).toBe(2);
    expect(
      (
        await app.inject({
          ...json('checker-token', 'terminal-change', { status: 'UNDER_REVIEW' }),
          url: '/v1/reconciliation/exceptions/ex1/review',
        })
      ).statusCode,
    ).toBe(409);
    await expect(
      db.query(`UPDATE reconciliation_exceptions SET evidence='{"changed":true}' WHERE id='ex1'`),
    ).rejects.toThrow(/immutable/i);
  });

  it('approves compensating adjustments with a different checker and appends one balanced reversal', async () => {
    await insertRun('run1');
    await insertException('ex1');
    await insertPayment();
    const original = await transaction(db, (c) =>
      postSuccessfulPayment(
        c,
        {
          id: 'pay1',
          merchant_id: 'm1',
          reference: 'REF-pay1',
          gross_minor: 1000,
          fee_minor: 20,
          tax_minor: 0,
          currency: 'MWK',
        },
        'provider-event',
      ),
    );
    const submitted = await app.inject({
        ...json('maker-token', 'adjust-one', {
          originalEntryId: original.entryId,
          reason: 'Approved correction',
          evidenceRef: 'case-4',
        }),
        url: '/v1/reconciliation/exceptions/ex1/adjustments',
      }),
      adjustment = submitted.json();
    expect(submitted.statusCode).toBe(201);
    expect(
      (
        await app.inject({
          ...json('maker-token', 'approve-self', {}),
          url: `/v1/reconciliation/adjustments/${adjustment.id}/approve`,
        })
      ).statusCode,
    ).toBe(409);
    const first = await app.inject({
        ...json('checker-token', 'approve-checker', {}),
        url: `/v1/reconciliation/adjustments/${adjustment.id}/approve`,
      }),
      second = await app.inject({
        ...json('checker-token', 'approve-retry', {}),
        url: `/v1/reconciliation/adjustments/${adjustment.id}/approve`,
      });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(
      Number(
        (
          await db.query(`SELECT count(*) FROM journal_entries WHERE reversed_entry_id=$1`, [
            original.entryId,
          ])
        ).rows[0].count,
      ),
    ).toBe(1);
    expect(
      Number(
        (await db.query(`SELECT count(*) FROM journal_entries WHERE id=$1`, [original.entryId]))
          .rows[0].count,
      ),
    ).toBe(1);
    const balance = await db.query(
      `SELECT sum(CASE direction WHEN 'DEBIT' THEN amount_minor ELSE -amount_minor END)::text total FROM journal_postings WHERE entry_id=$1`,
      [first.json().journal_entry_id],
    );
    expect(balance.rows[0].total).toBe('0');
  });

  it('rejects a compensating adjustment idempotently without posting ledger effects', async () => {
    await insertRun('run1');
    await insertException('ex1');
    await insertPayment();
    const original = await transaction(db, (c) =>
      postSuccessfulPayment(c, { id: 'pay1', merchant_id: 'm1', reference: 'REF-pay1', gross_minor: 1000, fee_minor: 20, tax_minor: 0, currency: 'MWK' }, 'event-reject'),
    );
    const submitted = await app.inject({ ...json('maker-token', 'adjust-reject', { originalEntryId: original.entryId, reason: 'No correction needed', evidenceRef: 'case-reject' }), url: '/v1/reconciliation/exceptions/ex1/adjustments' });
    const id = submitted.json().id;
    expect((await app.inject({ ...json('maker-token', 'reject-self', { reason: 'Not valid' }), url: `/v1/reconciliation/adjustments/${id}/reject` })).statusCode).toBe(409);
    const first = await app.inject({ ...json('checker-token', 'reject-checker', { reason: 'Evidence disproves adjustment' }), url: `/v1/reconciliation/adjustments/${id}/reject` });
    const retry = await app.inject({ ...json('checker-token', 'reject-retry', { reason: 'Evidence disproves adjustment' }), url: `/v1/reconciliation/adjustments/${id}/reject` });
    expect(first.json().status).toBe('REJECTED');
    expect(retry.json().status).toBe('REJECTED');
    expect(Number((await db.query(`SELECT count(*) FROM journal_entries WHERE reversed_entry_id=$1`, [original.entryId])).rows[0].count)).toBe(0);
    expect(Number((await db.query(`SELECT count(*) FROM audit_events WHERE action='COMPENSATING_ADJUSTMENT_REJECTED' AND resource_id=$1`, [id])).rows[0].count)).toBe(1);
  });

  it('rolls back adjustment approval, ledger effects, audit and outbox on a simulated mid-transaction failure', async () => {
    await insertRun('run1');
    await insertException('ex1');
    await insertPayment();
    const original = await transaction(db, (c) =>
      postSuccessfulPayment(
        c,
        {
          id: 'pay1',
          merchant_id: 'm1',
          reference: 'REF-pay1',
          gross_minor: 1000,
          fee_minor: 20,
          tax_minor: 0,
          currency: 'MWK',
        },
        'event-rollback',
      ),
    );
    const submitted = await app.inject({
        ...json('maker-token', 'adjust-rollback', {
          originalEntryId: original.entryId,
          reason: 'Rollback proof',
          evidenceRef: 'case-5',
        }),
        url: '/v1/reconciliation/exceptions/ex1/adjustments',
      }),
      id = submitted.json().id;
    await db.query(
      `CREATE FUNCTION fail_adjustment_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated failure'; END $$;CREATE TRIGGER fail_adjustment_update BEFORE UPDATE ON compensating_adjustments FOR EACH ROW EXECUTE FUNCTION fail_adjustment_test()`,
    );
    const beforeAudit = Number((await db.query('SELECT count(*) FROM audit_events')).rows[0].count),
      beforeOutbox = Number((await db.query('SELECT count(*) FROM outbox_events')).rows[0].count);
    expect(
      (
        await app.inject({
          ...json('checker-token', 'approve-fail', {}),
          url: `/v1/reconciliation/adjustments/${id}/approve`,
        })
      ).statusCode,
    ).toBe(500);
    expect(
      Number(
        (
          await db.query(`SELECT count(*) FROM journal_entries WHERE reversed_entry_id=$1`, [
            original.entryId,
          ])
        ).rows[0].count,
      ),
    ).toBe(0);
    expect(
      (
        await db.query('SELECT status,journal_entry_id FROM compensating_adjustments WHERE id=$1', [
          id,
        ])
      ).rows[0],
    ).toMatchObject({ status: 'AWAITING_APPROVAL', journal_entry_id: null });
    expect(Number((await db.query('SELECT count(*) FROM audit_events')).rows[0].count)).toBe(
      beforeAudit,
    );
    expect(Number((await db.query('SELECT count(*) FROM outbox_events')).rows[0].count)).toBe(
      beforeOutbox,
    );
    await db.query(
      'DROP TRIGGER fail_adjustment_update ON compensating_adjustments;DROP FUNCTION fail_adjustment_test()',
    );
  });

  it('verifies balanced ledger data without leaking another merchant', async () => {
    await insertPayment('pay1', 1000, 20, 'm1');
    await transaction(db, (c) =>
      postSuccessfulPayment(
        c,
        {
          id: 'pay1',
          merchant_id: 'm1',
          reference: 'REF-pay1',
          gross_minor: 1000,
          fee_minor: 20,
          tax_minor: 0,
          currency: 'MWK',
        },
        'integrity-one',
      ),
    );
    const response = await app.inject({
      url: '/v1/ledger/integrity',
      headers: session('maker-token'),
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, failures: [] });
    expect(
      (await app.inject({ url: '/v1/ledger/integrity', headers: session('viewer-token') }))
        .statusCode,
    ).toBe(403);
  });

  it('calculates authoritative integer settlement totals and rejects ineligible or cross-merchant runs', async () => {
    expect(
      (
        await app.inject({
          ...json('maker-token', 'no-recon', {
            currency: 'MWK',
            periodStart: start,
            periodEnd: end,
          }),
          url: '/v1/settlements',
        })
      ).statusCode,
    ).toBe(422);
    await insertRun('run1');
    await insertPayment('pay1', 1000, 20);
    await insertPayment('pay2', 500, 0);
    await db.query(
      `INSERT INTO refunds(id,merchant_id,payment_id,reference,amount_minor,reason,status,requested_by,approved_by,updated_at) VALUES('refund1','m1','pay1','RF-1',100,'Correction','APPROVED','maker','checker',$1)`,
      [start],
    );
    const response = await app.inject({
      ...json('maker-token', 'settlement-one', {
        currency: 'MWK',
        periodStart: start,
        periodEnd: end,
      }),
      url: '/v1/settlements',
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      grossMinor: '1500',
      refundsMinor: '100',
      feesMinor: '20',
      netMinor: '1380',
      externalTransferExecuted: false,
      sandboxOnly: true,
    });
    await db.query(`DELETE FROM settlement_batches`);
    await db.query(
      `UPDATE reconciliation_runs SET unmatched_count=1,matched_count=0 WHERE id='run1'`,
    );
    expect(
      (
        await app.inject({
          ...json('maker-token', 'unmatched-run', {
            currency: 'MWK',
            periodStart: start,
            periodEnd: end,
          }),
          url: '/v1/settlements',
        })
      ).statusCode,
    ).toBe(422);
  });

  it('cancels an eligible sandbox settlement durably and idempotently without financial effects', async () => {
    await insertRun('run1');
    await insertPayment();
    const created = await app.inject({
      ...json('maker-token', 'cancel-create', { currency: 'MWK', periodStart: start, periodEnd: end }),
      url: '/v1/settlements',
    });
    const id = created.json().id;
    const beforeLedger = Number((await db.query('SELECT count(*) FROM journal_entries')).rows[0].count);
    const cancelRequest = { ...json('maker-token', 'cancel-stable', {}), url: `/v1/settlements/${id}/cancel` };
    const first = await app.inject(cancelRequest);
    const retry = await app.inject(cancelRequest);
    expect(first.statusCode).toBe(200);
    expect(first.json().status).toBe('CANCELLED');
    expect(retry.statusCode).toBe(200);
    expect(retry.json().status).toBe('CANCELLED');
    expect((await db.query('SELECT status,external_transfer_executed,cancelled_at FROM settlement_batches WHERE id=$1', [id])).rows[0]).toMatchObject({ status: 'CANCELLED', external_transfer_executed: false });
    expect(Number((await db.query(`SELECT count(*) FROM audit_events WHERE action='SANDBOX_SETTLEMENT_CANCELLED' AND resource_id=$1`, [id])).rows[0].count)).toBe(1);
    expect(Number((await db.query('SELECT count(*) FROM journal_entries')).rows[0].count)).toBe(beforeLedger);
    expect(Number((await db.query('SELECT count(*) FROM settlement_exports WHERE batch_id=$1', [id])).rows[0].count)).toBe(0);
    expect((await app.inject({ ...json('checker-token', 'approve-cancelled', {}), url: `/v1/settlements/${id}/approve` })).statusCode).toBe(409);
    expect((await app.inject({ ...json('maker-token', 'export-cancelled', {}), url: `/v1/settlements/${id}/export` })).statusCode).toBe(409);
    expect((await app.inject({ ...json('maker-token', 'cancel-different', {}), url: `/v1/settlements/${id}/cancel` })).statusCode).toBe(409);
    expect((await app.inject({ ...json('other-token', 'foreign-cancel', {}), url: `/v1/settlements/${id}/cancel` })).statusCode).toBe(404);
    await expect(db.query('UPDATE settlement_batches SET gross_minor=999,net_minor=979 WHERE id=$1', [id])).rejects.toThrow(/immutable/i);
  });

  it('serializes duplicate settlement creation and enforces approval, cancellation, immutable export and no payout', async () => {
    await insertRun('run1');
    await insertPayment();
    const body = { currency: 'MWK', periodStart: start, periodEnd: end },
      created = await Promise.all(
        ['settle-a', 'settle-b'].map((key) =>
          app.inject({ ...json('maker-token', key, body), url: '/v1/settlements' }),
        ),
      );
    expect(created.filter((x) => x.statusCode === 201)).toHaveLength(1);
    expect(created.filter((x) => x.statusCode === 409)).toHaveLength(1);
    const id = created.find((x) => x.statusCode === 201)!.json().id;
    expect(
      (
        await app.inject({
          ...json('maker-token', 'submit-one', {}),
          url: `/v1/settlements/${id}/submit`,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          ...json('maker-token', 'approve-self', {}),
          url: `/v1/settlements/${id}/approve`,
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          ...json('checker-token', 'approve-other', {}),
          url: `/v1/settlements/${id}/approve`,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          ...json('checker-token', 'approve-again', {}),
          url: `/v1/settlements/${id}/approve`,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          ...json('maker-token', 'cancel-approved', {}),
          url: `/v1/settlements/${id}/cancel`,
        })
      ).statusCode,
    ).toBe(409);
    const first = await app.inject({
        ...json('maker-token', 'export-one', {}),
        url: `/v1/settlements/${id}/export`,
      }),
      second = await app.inject({
        ...json('maker-token', 'export-two', {}),
        url: `/v1/settlements/${id}/export`,
      });
    expect(first.statusCode).toBe(200);
    expect(second.body).toBe(first.body);
    expect(
      Number(
        (await db.query(`SELECT count(*) FROM settlement_exports WHERE batch_id=$1`, [id])).rows[0]
          .count,
      ),
    ).toBe(1);
    expect(
      (
        await db.query(
          `SELECT external_transfer_executed,status FROM settlement_batches WHERE id=$1`,
          [id],
        )
      ).rows[0],
    ).toMatchObject({ external_transfer_executed: false, status: 'EXPORTED' });
    await expect(
      db.query(`UPDATE settlement_batches SET gross_minor=999 WHERE id=$1`, [id]),
    ).rejects.toThrow(/immutable/i);
  });

  it('enforces permissions, CSRF, API-key compatibility, rate-limit headers and generic errors', async () => {
    const body = { type: 'PAYMENTS', currency: 'MWK', periodStart: start, periodEnd: end };
    const csrf = await app.inject({
      method: 'POST',
      url: '/v1/reconciliation/runs',
      headers: {
        cookie: 'giantpay_session=maker-token',
        'content-type': 'application/json',
        'idempotency-key': 'csrf-proof',
      },
      payload: body,
    });
    expect(csrf.statusCode).toBe(403);
    expect(csrf.json().error).toMatchObject({ code: 'ORIGIN_REJECTED' });
    expect(
      (
        await app.inject({
          ...json('viewer-token', 'permission-proof', body),
          url: '/v1/reconciliation/runs',
        })
      ).statusCode,
    ).toBe(403);
    const generated = generateApiKey();
    await db.query(
      `INSERT INTO api_keys(id,public_id,merchant_id,name,verifier,fingerprint,scopes,created_by) VALUES('api-proof',$1,'m1','Proof',$2,'masked',ARRAY['payments:read'],'maker')`,
      [generated.publicId, apiKeyVerifier(generated.plaintext, 'p'.repeat(32))],
    );
    const api = await app.inject({
      method: 'POST',
      url: '/v1/reconciliation/runs',
      headers: {
        authorization: `Bearer ${generated.plaintext}`,
        'content-type': 'application/json',
        'idempotency-key': 'api-no-csrf',
      },
      payload: body,
    });
    expect(api.statusCode).toBe(403);
    expect(api.json().error.code).toBe('FORBIDDEN');
    const limited = [];
    for (let i = 0; i < 21; i++)
      limited.push(
        await app.inject({
          ...json('maker-token', `rate-${i}`, body),
          url: '/v1/reconciliation/runs',
        }),
      );
    expect(limited.at(-1)!.statusCode).toBe(429);
    expect(limited.at(-1)!.headers['retry-after']).toBeDefined();
    expect(JSON.stringify(limited.at(-1)!.json())).not.toMatch(/password|token|secret/i);
  });
});
