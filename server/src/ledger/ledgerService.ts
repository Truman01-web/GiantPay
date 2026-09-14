import type pg from 'pg';
import { newId } from '../security.js';

type AccountCode = 'PROVIDER_CLEARING' | 'MERCHANT_PAYABLE' | 'PLATFORM_FEE_REVENUE' | 'TAX_PAYABLE' | 'REFUND_CLEARING' | 'SUSPENSE';
interface PaymentRow { id: string; merchant_id: string; reference: string; gross_minor: string | number; fee_minor: string | number; tax_minor: string | number; currency: string }

export class LedgerError extends Error {
  constructor(public readonly code: 'ACCOUNTING_DATA_INVALID' | 'LEDGER_ENTRY_NOT_FOUND' | 'LEDGER_REVERSAL_CONFLICT', message: string) { super(message); }
}

function minor(value: string | number, field: string): bigint {
  if (!/^\d+$/.test(String(value))) throw new LedgerError('ACCOUNTING_DATA_INVALID', `${field} must be a non-negative integer.`);
  return BigInt(value);
}

async function account(client: pg.PoolClient, owner: 'PLATFORM' | 'MERCHANT', merchantId: string | null, code: AccountCode, currency: string, name: string) {
  const inserted = await client.query(
    `INSERT INTO ledger_accounts(id,owner_type,merchant_id,code,currency,name) VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(owner_type,merchant_id,code,currency) DO NOTHING RETURNING id`,
    [newId('lac'), owner, merchantId, code, currency, name],
  );
  if (inserted.rowCount) return inserted.rows[0].id as string;
  const existing = await client.query(
    `SELECT id FROM ledger_accounts WHERE owner_type=$1 AND merchant_id IS NOT DISTINCT FROM $2 AND code=$3 AND currency=$4`,
    [owner, merchantId, code, currency],
  );
  return existing.rows[0].id as string;
}

export async function postSuccessfulPayment(client: pg.PoolClient, payment: PaymentRow, sourceEventId: string) {
  if (!/^[A-Z]{3}$/.test(payment.currency)) throw new LedgerError('ACCOUNTING_DATA_INVALID', 'Payment currency is invalid.');
  const gross = minor(payment.gross_minor, 'gross');
  const fee = minor(payment.fee_minor, 'fee');
  const tax = minor(payment.tax_minor, 'tax');
  const net = gross - fee - tax;
  if (gross <= 0n || net < 0n || gross !== net + fee + tax) throw new LedgerError('ACCOUNTING_DATA_INVALID', 'Payment accounting amounts are invalid.');

  const existing = await client.query(`SELECT id FROM journal_entries WHERE source_type='PAYMENT_SUCCESS' AND source_id=$1 AND source_event_id=$2`, [payment.id, sourceEventId]);
  if (existing.rowCount) return { entryId: existing.rows[0].id as string, created: false };

  const provider = await account(client, 'PLATFORM', null, 'PROVIDER_CLEARING', payment.currency, 'Provider clearing');
  const merchant = await account(client, 'MERCHANT', payment.merchant_id, 'MERCHANT_PAYABLE', payment.currency, 'Merchant payable');
  const revenue = fee > 0n ? await account(client, 'PLATFORM', null, 'PLATFORM_FEE_REVENUE', payment.currency, 'Platform fee revenue') : null;
  const taxes = tax > 0n ? await account(client, 'PLATFORM', null, 'TAX_PAYABLE', payment.currency, 'Tax payable') : null;
  const entryId = newId('jne');
  const inserted = await client.query(
    `INSERT INTO journal_entries(id,merchant_id,source_type,source_id,source_event_id,description) VALUES($1,$2,'PAYMENT_SUCCESS',$3,$4,$5)
     ON CONFLICT(source_type,source_id,source_event_id) DO NOTHING RETURNING id`,
    [entryId, payment.merchant_id, payment.id, sourceEventId, `Successful payment ${payment.reference}`],
  );
  if (!inserted.rowCount) {
    const winner = await client.query(`SELECT id FROM journal_entries WHERE source_type='PAYMENT_SUCCESS' AND source_id=$1 AND source_event_id=$2`, [payment.id, sourceEventId]);
    return { entryId: winner.rows[0].id as string, created: false };
  }
  const postings: Array<[string, 'DEBIT' | 'CREDIT', bigint]> = [[provider, 'DEBIT', gross], [merchant, 'CREDIT', net]];
  if (revenue) postings.push([revenue, 'CREDIT', fee]);
  if (taxes) postings.push([taxes, 'CREDIT', tax]);
  for (const [accountId, direction, amount] of postings) {
    if (amount === 0n) continue;
    await client.query(`INSERT INTO journal_postings(id,entry_id,account_id,direction,amount_minor,currency) VALUES($1,$2,$3,$4,$5,$6)`, [newId('jnp'), entryId, accountId, direction, amount.toString(), payment.currency]);
  }
  await client.query(
    `INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,deduplication_key)
     VALUES($1,'payment.succeeded','payment',$2,$3,$4) ON CONFLICT(deduplication_key) DO NOTHING`,
    [newId('obx'), payment.id, { paymentId: payment.id, paymentReference: payment.reference, merchantId: payment.merchant_id, currency: payment.currency, amountMinor: gross.toString(), journalEntryId: entryId }, `payment.succeeded:${payment.id}:${sourceEventId}`],
  );
  return { entryId, created: true };
}

export async function reverseJournalEntry(client: pg.PoolClient, originalId: string, reason: string, actorId: string | null, sourceEventId: string) {
  if (reason.trim().length < 3) throw new LedgerError('ACCOUNTING_DATA_INVALID', 'A reversal reason is required.');
  const original = await client.query('SELECT * FROM journal_entries WHERE id=$1', [originalId]);
  if (!original.rowCount) throw new LedgerError('LEDGER_ENTRY_NOT_FOUND', 'Ledger entry was not found.');
  const postings = await client.query('SELECT * FROM journal_postings WHERE entry_id=$1 ORDER BY id', [originalId]);
  const reversalId = newId('jne');
  try {
    await client.query(
      `INSERT INTO journal_entries(id,merchant_id,source_type,source_id,source_event_id,description,reversed_entry_id,reversal_reason,actor_id)
       VALUES($1,$2,'REVERSAL',$3,$4,$5,$3,$6,$7)`,
      [reversalId, original.rows[0].merchant_id, originalId, sourceEventId, `Reversal of ${originalId}`, reason.trim(), actorId],
    );
  } catch (error: any) {
    if (error?.code === '23505') throw new LedgerError('LEDGER_REVERSAL_CONFLICT', 'Ledger entry has already been reversed.');
    throw error;
  }
  for (const posting of postings.rows) {
    await client.query(`INSERT INTO journal_postings(id,entry_id,account_id,direction,amount_minor,currency) VALUES($1,$2,$3,$4,$5,$6)`, [newId('jnp'), reversalId, posting.account_id, posting.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT', posting.amount_minor, posting.currency]);
  }
  return reversalId;
}
