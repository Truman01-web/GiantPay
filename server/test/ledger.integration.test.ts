import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { transaction } from '../src/db.js';
import { postSuccessfulPayment, reverseJournalEntry } from '../src/ledger/ledgerService.js';
import { OutboxWorker } from '../src/outbox/outboxWorker.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const schema = `ledger_test_${randomUUID().replaceAll('-', '')}`;
let admin: pg.Pool;
let db: pg.Pool;

const payment = { id: 'p1', merchant_id: 'm1', reference: 'GP-1', gross_minor: 1000, fee_minor: 20, tax_minor: 5, currency: 'MWK' };

suite('immutable ledger and outbox', () => {
  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: databaseUrl! });
    await admin.query(`CREATE SCHEMA ${schema}`);
    db = new pg.Pool({ connectionString: databaseUrl!, options: `-c search_path=${schema}` });
    for (const name of (await readdir(resolve('migrations'))).filter((x) => x.endsWith('.sql')).sort()) {
      await db.query(await readFile(resolve('migrations', name), 'utf8'));
    }
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin?.end();
  });

  beforeEach(async () => {
    await db.query('TRUNCATE outbox_events,journal_postings,journal_entries,ledger_accounts,payments,users,merchants CASCADE');
    await db.query(`INSERT INTO merchants(id,name) VALUES('m1','Merchant One'),('m2','Merchant Two')`);
  });

  it('posts a balanced payment journal using authoritative integer amounts', async () => {
    const result = await transaction(db, (client) => postSuccessfulPayment(client, payment, 'event-1'));
    const totals = await db.query(`SELECT direction,sum(amount_minor)::text total FROM journal_postings WHERE entry_id=$1 GROUP BY direction`, [result.entryId]);
    expect(Object.fromEntries(totals.rows.map((row) => [row.direction,row.total]))).toEqual({ CREDIT: '1000', DEBIT: '1000' });
  });

  it('omits zero fee and tax postings', async () => {
    const result = await transaction(db, (client) => postSuccessfulPayment(client, { ...payment, fee_minor: 0, tax_minor: 0 }, 'event-zero'));
    expect(Number((await db.query('SELECT count(*) FROM journal_postings WHERE entry_id=$1', [result.entryId])).rows[0].count)).toBe(2);
  });

  it('rejects invalid accounting equality and non-integer inputs', async () => {
    await expect(transaction(db, (client) => postSuccessfulPayment(client, { ...payment, fee_minor: 1001 }, 'bad-1'))).rejects.toMatchObject({ code: 'ACCOUNTING_DATA_INVALID' });
    await expect(transaction(db, (client) => postSuccessfulPayment(client, { ...payment, gross_minor: 10.5 }, 'bad-2'))).rejects.toMatchObject({ code: 'ACCOUNTING_DATA_INVALID' });
  });

  it('rejects an unbalanced entry at commit', async () => {
    await expect(transaction(db, async (client) => {
      await client.query(`INSERT INTO ledger_accounts(id,owner_type,code,currency,name) VALUES('a1','PLATFORM','PROVIDER_CLEARING','MWK','A')`);
      await client.query(`INSERT INTO journal_entries(id,merchant_id,source_type,source_id,source_event_id,description) VALUES('e1','m1','TEST','x','x','test')`);
      await client.query(`INSERT INTO journal_postings(id,entry_id,account_id,direction,amount_minor,currency) VALUES('x1','e1','a1','DEBIT',100,'MWK'),('x2','e1','a1','CREDIT',99,'MWK')`);
    })).rejects.toThrow(/unbalanced/i);
  });

  it('is idempotent by source event and writes one atomic outbox event', async () => {
    const first = await transaction(db, (client) => postSuccessfulPayment(client, payment, 'same-event'));
    const second = await transaction(db, (client) => postSuccessfulPayment(client, payment, 'same-event'));
    expect(first.created).toBe(true);
    expect(second).toEqual({ entryId: first.entryId, created: false });
    expect(Number((await db.query('SELECT count(*) FROM journal_entries')).rows[0].count)).toBe(1);
    expect(Number((await db.query('SELECT count(*) FROM outbox_events')).rows[0].count)).toBe(1);
  });

  it('prevents updates and deletes of posted records', async () => {
    const result = await transaction(db, (client) => postSuccessfulPayment(client, payment, 'immutable'));
    await expect(db.query(`UPDATE journal_entries SET description='changed' WHERE id=$1`, [result.entryId])).rejects.toThrow(/immutable/i);
    await expect(db.query(`DELETE FROM journal_postings WHERE entry_id=$1`, [result.entryId])).rejects.toThrow(/immutable/i);
  });

  it('creates a balanced opposite reversal and rejects a second reversal', async () => {
    const original = await transaction(db, (client) => postSuccessfulPayment(client, payment, 'original'));
    const reversed = await transaction(db, (client) => reverseJournalEntry(client, original.entryId, 'Correction approved', null, 'reverse-1'));
    const comparison = await db.query(
      `SELECT o.account_id,o.direction original_direction,r.direction reversal_direction,o.amount_minor::text
       FROM journal_postings o JOIN journal_postings r ON r.account_id=o.account_id AND r.amount_minor=o.amount_minor
       WHERE o.entry_id=$1 AND r.entry_id=$2`, [original.entryId,reversed],
    );
    expect(comparison.rows).toHaveLength(4);
    expect(comparison.rows.every((row) => row.original_direction !== row.reversal_direction)).toBe(true);
    await expect(transaction(db, (client) => reverseJournalEntry(client, original.entryId, 'Again', null, 'reverse-2'))).rejects.toMatchObject({ code: 'LEDGER_REVERSAL_CONFLICT' });
  });

  it('isolates merchant and currency accounts', async () => {
    await transaction(db, (client) => postSuccessfulPayment(client, payment, 'm1-mwk'));
    await transaction(db, (client) => postSuccessfulPayment(client, { ...payment, id: 'p2', merchant_id: 'm2', reference: 'GP-2' }, 'm2-mwk'));
    await transaction(db, (client) => postSuccessfulPayment(client, { ...payment, id: 'p3', currency: 'USD', reference: 'GP-3' }, 'm1-usd'));
    const accounts = await db.query(`SELECT merchant_id,currency,count(*)::int count FROM ledger_accounts WHERE owner_type='MERCHANT' GROUP BY merchant_id,currency ORDER BY merchant_id,currency`);
    expect(accounts.rows).toEqual([{ merchant_id: 'm1', currency: 'MWK', count: 1 }, { merchant_id: 'm1', currency: 'USD', count: 1 }, { merchant_id: 'm2', currency: 'MWK', count: 1 }]);
  });

  it('lets only one worker claim an event', async () => {
    await transaction(db, (client) => postSuccessfulPayment(client, payment, 'worker-event'));
    const publish = vi.fn(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    const workers = [new OutboxWorker(db, { publish }), new OutboxWorker(db, { publish })];
    await Promise.all(workers.map((worker) => worker.runOnce()));
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('moves a permanently failing outbox event to failed', async () => {
    await db.query(`INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,deduplication_key,max_attempts) VALUES('o1','test','payment','p1','{}','fail-once',1)`);
    const worker = new OutboxWorker(db, { publish: async () => { throw new Error('temporary internal failure'); } });
    await worker.runOnce();
    expect((await db.query(`SELECT status,attempt_count,last_error FROM outbox_events WHERE id='o1'`)).rows[0]).toMatchObject({ status: 'FAILED', attempt_count: 1, last_error: 'temporary internal failure' });
  });
});
