import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { operationalControlGuard } from '../operations/controls.js';
import type { Config } from '../config.js';
import type { Db } from '../db.js';
import { transaction } from '../db.js';
import { rateLimit, type RateLimitStore } from '../rateLimit.js';
import { apiError, authenticateSessionOrApiKey, newId, requirePermission } from '../security.js';
import { reverseJournalEntry } from '../ledger/ledgerService.js';
import { evidenceHash, reconcileRecords, type ReconciliationRecord } from './matching.js';
import { settlementCsv } from './csv.js';

const page = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const periodFields = {
  currency: z.string().regex(/^[A-Z]{3}$/),
  periodStart: z.iso.datetime(),
  periodEnd: z.iso.datetime(),
};
const validPeriodOrder = (v: { periodStart: string; periodEnd: string }) =>
  new Date(v.periodEnd) > new Date(v.periodStart);
const periodOrderError = { message: 'periodEnd must follow periodStart' };
const settlementPeriod = z.object(periodFields).refine(validPeriodOrder, periodOrderError);
const period = z
  .object({
    ...periodFields,
    businessDate: z.iso.date().optional(),
    type: z.enum(['PAYMENTS', 'REFUNDS', 'LEDGER_INTEGRITY', 'OUTBOX']).default('PAYMENTS'),
  })
  .refine(validPeriodOrder, periodOrderError);
const viewRun = (r: any) => ({
  id: r.id,
  type: r.reconciliation_type,
  provider: r.provider,
  environment: r.environment,
  currency: r.currency,
  periodStart: r.period_start,
  periodEnd: r.period_end,
  businessDate: r.business_date,
  status: r.status,
  sourceCount: r.source_count,
  matchedCount: r.matched_count,
  unmatchedCount: r.unmatched_count,
  sourceTotalMinor: String(r.source_total_minor),
  internalTotalMinor: String(r.internal_total_minor),
  startedAt: r.started_at,
  completedAt: r.completed_at,
  failureSummary: r.failure_summary,
});
const viewBatch = (r: any) => ({
  id: r.id,
  currency: r.currency,
  periodStart: r.period_start,
  periodEnd: r.period_end,
  status: r.status,
  grossMinor: String(r.gross_minor),
  refundsMinor: String(r.refunds_minor),
  feesMinor: String(r.fees_minor),
  netMinor: String(r.net_minor),
  createdAt: r.created_at,
  approvedAt: r.approved_at,
  exportedAt: r.exported_at,
  externalTransferExecuted: false,
  sandboxOnly: true,
});

export async function registerReconciliationRoutes(
  app: FastifyInstance,
  config: Config,
  db: Db,
  limits: RateLimitStore,
) {
  const auth = authenticateSessionOrApiKey(db, config.PASSWORD_PEPPER, limits, config),
    mutate = rateLimit(
      limits,
      config,
      'accounting-control-mutation',
      20,
      60,
      (r) => `${r.actor?.merchantId}:${r.actor?.id}`,
    );
  const reconRead = [auth, requirePermission('reconciliation:read')],
    reconWrite = [auth, requirePermission('reconciliation:manage'), mutate, operationalControlGuard(db,'SETTLEMENT_PROCESSING_PAUSED')],
    settleRead = [auth, requirePermission('settlements:read')],
    settleWrite = [auth, requirePermission('settlements:manage'), mutate, operationalControlGuard(db,'SETTLEMENT_PROCESSING_PAUSED')];
  app.post('/v1/reconciliation/runs', { preHandler: reconWrite }, async (request, reply) => {
    const b = period.parse(request.body),
      key = z.string().min(8).max(128).parse(request.headers['idempotency-key']);
    return transaction(db, async (c) => {
      await c.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
        `${request.actor!.merchantId}:${b.type}:${b.currency}:${b.periodStart}:${b.periodEnd}`,
      ]);
      const existing = await c.query(
        `SELECT * FROM reconciliation_runs WHERE merchant_id=$1 AND reconciliation_type=$2 AND provider='sandbox' AND currency=$3 AND period_start=$4 AND period_end=$5`,
        [request.actor!.merchantId, b.type, b.currency, b.periodStart, b.periodEnd],
      );
      if (existing.rowCount) return viewRun(existing.rows[0]);
      const configSnapshot = {
        version: 1,
        type: b.type,
        provider: 'sandbox',
        currency: b.currency,
        periodStart: b.periodStart,
        periodEnd: b.periodEnd,
        businessDate: b.businessDate ?? null,
        idempotencyKeyHash: evidenceHash(key),
      };
      const internalResult = await c.query(
        `SELECT p.id "internalId",p.reference,p.gross_minor "amountMinor",p.currency,p.status,p.updated_at "eventAt",count(DISTINCT j.id)::int "ledgerPostingCount",coalesce(bool_and(coalesce(balance.amount,0)=0),true) "ledgerBalanced",bool_or(o.id IS NOT NULL) "hasRequiredOutbox" FROM payments p LEFT JOIN journal_entries j ON j.merchant_id=p.merchant_id AND j.source_id=p.id LEFT JOIN (SELECT jp.entry_id,sum(CASE jp.direction WHEN 'DEBIT' THEN jp.amount_minor ELSE -jp.amount_minor END) amount FROM journal_postings jp GROUP BY jp.entry_id) balance ON balance.entry_id=j.id LEFT JOIN outbox_events o ON o.aggregate_type='payment' AND o.aggregate_id=p.id AND o.event_type='payment.succeeded' WHERE p.merchant_id=$1 AND p.currency=$2 AND p.updated_at >= $3 AND p.updated_at < $4 GROUP BY p.id`,
        [request.actor!.merchantId, b.currency, b.periodStart, b.periodEnd],
      );
      const providerResult = await c.query(
        `SELECT p.reference,p.gross_minor "amountMinor",p.currency,pa.status,pa.updated_at "eventAt",wr.received_at "receivedAt" FROM payment_attempts pa JOIN payments p ON p.id=pa.payment_id LEFT JOIN webhook_receipts wr ON wr.payment_reference=p.reference AND wr.provider='sandbox' WHERE p.merchant_id=$1 AND p.currency=$2 AND pa.updated_at >= $3 AND pa.updated_at < $4`,
        [request.actor!.merchantId, b.currency, b.periodStart, b.periodEnd],
      );
      const convert = (r: any): ReconciliationRecord => ({
        ...r,
        amountMinor: BigInt(r.amountMinor),
        eventAt: new Date(r.eventAt).toISOString(),
        receivedAt: r.receivedAt ? new Date(r.receivedAt).toISOString() : undefined,
      });
      const result = reconcileRecords(
          internalResult.rows.map(convert),
          providerResult.rows.map(convert),
          b.periodEnd,
        ),
        id = newId('rec');
      await c.query(
        `INSERT INTO reconciliation_runs(id,merchant_id,reconciliation_type,provider,environment,currency,period_start,period_end,business_date,status,source_count,matched_count,unmatched_count,source_total_minor,internal_total_minor,config_snapshot,source_sha256,initiated_by,completed_at) VALUES($1,$2,$3,'sandbox','sandbox',$4,$5,$6,$7,'COMPLETED',$8,$9,$10,$11,$12,$13,$14,$15,now())`,
        [
          id,
          request.actor!.merchantId,
          b.type,
          b.currency,
          b.periodStart,
          b.periodEnd,
          b.businessDate ?? null,
          result.sourceCount,
          result.matched,
          result.unmatched,
          result.sourceTotalMinor.toString(),
          result.internalTotalMinor.toString(),
          configSnapshot,
          result.sourceHash,
          request.actor!.id,
        ],
      );
      for (const x of result.exceptions)
        await c.query(
          `INSERT INTO reconciliation_exceptions(id,run_id,merchant_id,classification,source_reference,evidence,evidence_sha256) VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [
            newId('rex'),
            id,
            request.actor!.merchantId,
            x.classification,
            x.reference,
            x.evidence,
            evidenceHash(x.evidence),
          ],
        );
      await c.query(
        `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,'RECONCILIATION_COMPLETED','reconciliation_run',$4,$5)`,
        [
          newId('aud'),
          request.actor!.id,
          request.actor!.merchantId,
          id,
          { matched: result.matched, exceptions: result.exceptions.length },
        ],
      );
      request.log.info(
        { reconciliationId: id, matched: result.matched, exceptions: result.exceptions.length },
        'reconciliation completed',
      );
      reply.code(201);
      return viewRun(
        (await c.query('SELECT * FROM reconciliation_runs WHERE id=$1', [id])).rows[0],
      );
    });
  });
  app.get('/v1/reconciliation/runs', { preHandler: reconRead }, async (r) => {
    const q = page.parse(r.query),
      x = await db.query(
        `SELECT *,count(*) OVER() total FROM reconciliation_runs WHERE merchant_id=$1 ORDER BY started_at DESC,id DESC LIMIT $2 OFFSET $3`,
        [r.actor!.merchantId, q.pageSize, (q.page - 1) * q.pageSize],
      );
    return {
      data: x.rows.map(viewRun),
      page: q.page,
      pageSize: q.pageSize,
      total: Number(x.rows[0]?.total ?? 0),
    };
  });
  app.get('/v1/reconciliation/runs/:id', { preHandler: reconRead }, async (r, p) => {
    const id = (r.params as any).id,
      x = await db.query('SELECT * FROM reconciliation_runs WHERE id=$1 AND merchant_id=$2', [
        id,
        r.actor!.merchantId,
      ]);
    return x.rowCount
      ? viewRun(x.rows[0])
      : p.code(404).send(apiError(r, 'NOT_FOUND', 'Reconciliation run not found.'));
  });
  app.get('/v1/reconciliation/exceptions', { preHandler: reconRead }, async (r) => {
    const q = page
        .extend({ status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']).optional() })
        .parse(r.query),
      x = await db.query(
        `SELECT *,count(*) OVER() total FROM reconciliation_exceptions WHERE merchant_id=$1 AND ($2::text IS NULL OR status=$2) ORDER BY created_at DESC,id DESC LIMIT $3 OFFSET $4`,
        [r.actor!.merchantId, q.status ?? null, q.pageSize, (q.page - 1) * q.pageSize],
      );
    return {
      data: x.rows,
      page: q.page,
      pageSize: q.pageSize,
      total: Number(x.rows[0]?.total ?? 0),
    };
  });
  app.get('/v1/reconciliation/exceptions/:id', { preHandler: reconRead }, async (r, p) => {
    const x = await db.query(
      'SELECT * FROM reconciliation_exceptions WHERE id=$1 AND merchant_id=$2',
      [(r.params as any).id, r.actor!.merchantId],
    );
    return x.rowCount
      ? x.rows[0]
      : p.code(404).send(apiError(r, 'NOT_FOUND', 'Reconciliation exception not found.'));
  });
  app.post('/v1/reconciliation/exceptions/:id/review', { preHandler: reconWrite }, async (r, p) => {
    const b = z
        .object({
          status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
          reason: z.string().min(3).optional(),
          evidenceRef: z.string().min(3).optional(),
        })
        .parse(r.body),
      key = z.string().min(8).max(128).parse(r.headers['idempotency-key']);
    return transaction(db, async (c) => {
      const prior = await c.query(
        'SELECT * FROM reconciliation_exception_events WHERE merchant_id=$1 AND idempotency_key=$2',
        [r.actor!.merchantId, key],
      );
      if (prior.rowCount) return { accepted: true };
      const x = await c.query(
        'SELECT * FROM reconciliation_exceptions WHERE id=$1 AND merchant_id=$2 FOR UPDATE',
        [(r.params as any).id, r.actor!.merchantId],
      );
      if (!x.rowCount) {
        p.code(404);
        return apiError(r, 'NOT_FOUND', 'Reconciliation exception not found.');
      }
      if (['RESOLVED', 'DISMISSED'].includes(x.rows[0].status)) {
        p.code(409);
        return apiError(r, 'STATE_CONFLICT', 'Resolved exceptions are immutable.');
      }
      if (['RESOLVED', 'DISMISSED'].includes(b.status) && (!b.reason || !b.evidenceRef)) {
        p.code(422);
        return apiError(r, 'VALIDATION_ERROR', 'Resolution reason and evidence are required.');
      }
      await c.query(
        `UPDATE reconciliation_exceptions SET status=$1,claimed_by=coalesce(claimed_by,$2),resolution_reason=$3,resolution_evidence_ref=$4,resolved_at=CASE WHEN $1 IN ('RESOLVED','DISMISSED') THEN now() ELSE NULL END WHERE id=$5`,
        [b.status, r.actor!.id, b.reason ?? null, b.evidenceRef ?? null, x.rows[0].id],
      );
      await c.query(
        `INSERT INTO reconciliation_exception_events(id,exception_id,merchant_id,actor_id,from_status,to_status,note,evidence_ref,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          newId('ree'),
          x.rows[0].id,
          r.actor!.merchantId,
          r.actor!.id,
          x.rows[0].status,
          b.status,
          b.reason ?? null,
          b.evidenceRef ?? null,
          key,
        ],
      );
      return { accepted: true };
    });
  });
  app.post(
    '/v1/reconciliation/exceptions/:id/adjustments',
    { preHandler: reconWrite },
    async (r, p) => {
      const b = z
          .object({
            originalEntryId: z.string(),
            reason: z.string().min(3),
            evidenceRef: z.string().min(3),
          })
          .parse(r.body),
        key = z.string().min(8).max(128).parse(r.headers['idempotency-key']);
      try {
        const x = await db.query(
          `INSERT INTO compensating_adjustments(id,exception_id,merchant_id,original_entry_id,reason,evidence_ref,created_by,idempotency_key)
           SELECT $1,e.id,e.merchant_id,j.id,$3,$4,$5,$6
           FROM reconciliation_exceptions e
           JOIN journal_entries j ON j.id=$2 AND j.merchant_id=e.merchant_id
           WHERE e.id=$7 AND e.merchant_id=$8
           ON CONFLICT(merchant_id,idempotency_key) DO UPDATE SET idempotency_key=excluded.idempotency_key
           RETURNING *`,
          [
            newId('adj'),
            b.originalEntryId,
            b.reason,
            b.evidenceRef,
            r.actor!.id,
            key,
            (r.params as any).id,
            r.actor!.merchantId,
          ],
        );
        if (x.rowCount) return p.code(201).send(x.rows[0]);
        const exception = await db.query(
          'SELECT 1 FROM reconciliation_exceptions WHERE id=$1 AND merchant_id=$2',
          [(r.params as any).id, r.actor!.merchantId],
        );
        return exception.rowCount
          ? p
              .code(422)
              .send(apiError(r, 'VALIDATION_ERROR', 'Referenced ledger entry is invalid.'))
          : p.code(404).send(apiError(r, 'NOT_FOUND', 'Reconciliation exception not found.'));
      } catch (e: any) {
        if (e.code === '23503')
          return p
            .code(422)
            .send(apiError(r, 'VALIDATION_ERROR', 'Referenced ledger entry is invalid.'));
        throw e;
      }
    },
  );
  app.post(
    '/v1/reconciliation/adjustments/:id/approve',
    { preHandler: [auth, requirePermission('reconciliation:approve'), mutate] },
    async (r, p) =>
      transaction(db, async (c) => {
        const x = await c.query(
          `SELECT * FROM compensating_adjustments WHERE id=$1 AND merchant_id=$2 FOR UPDATE`,
          [(r.params as any).id, r.actor!.merchantId],
        );
        if (!x.rowCount) {
          p.code(404);
          return apiError(r, 'NOT_FOUND', 'Adjustment not found.');
        }
        if (x.rows[0].created_by === r.actor!.id) {
          p.code(409);
          return apiError(
            r,
            'MAKER_CHECKER_REQUIRED',
            'The creator cannot approve this adjustment.',
          );
        }
        if (x.rows[0].status === 'APPROVED') return x.rows[0];
        const entry = await reverseJournalEntry(
          c,
          x.rows[0].original_entry_id,
          x.rows[0].reason,
          r.actor!.id,
          `adjustment:${x.rows[0].id}`,
        );
        const approved = (
          await c.query(
            `UPDATE compensating_adjustments SET status='APPROVED',approved_by=$1,journal_entry_id=$2,decided_at=now() WHERE id=$3 RETURNING *`,
            [r.actor!.id, entry, x.rows[0].id],
          )
        ).rows[0];
        await c.query(
          `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,'COMPENSATING_ADJUSTMENT_APPROVED','compensating_adjustment',$4,$5)`,
          [newId('aud'), r.actor!.id, r.actor!.merchantId, approved.id, { journalEntryId: entry }],
        );
        return approved;
      }),
  );
  app.post(
    '/v1/reconciliation/adjustments/:id/reject',
    { preHandler: [auth, requirePermission('reconciliation:approve'), mutate] },
    async (r, p) => {
      const reason = z.object({ reason: z.string().trim().min(3) }).parse(r.body).reason;
      return transaction(db, async (c) => {
        const current = await c.query(
          `SELECT * FROM compensating_adjustments WHERE id=$1 AND merchant_id=$2 FOR UPDATE`,
          [(r.params as any).id, r.actor!.merchantId],
        );
        if (!current.rowCount) {
          p.code(404);
          return apiError(r, 'NOT_FOUND', 'Adjustment not found.');
        }
        if (current.rows[0].created_by === r.actor!.id) {
          p.code(409);
          return apiError(
            r,
            'MAKER_CHECKER_REQUIRED',
            'The creator cannot reject this adjustment.',
          );
        }
        if (current.rows[0].status === 'REJECTED') return current.rows[0];
        if (current.rows[0].status !== 'AWAITING_APPROVAL') {
          p.code(409);
          return apiError(r, 'STATE_CONFLICT', 'Adjustment is not awaiting review.');
        }
        const rejected = (
          await c.query(
            `UPDATE compensating_adjustments SET status='REJECTED',approved_by=$1,decided_at=now() WHERE id=$2 RETURNING *`,
            [r.actor!.id, current.rows[0].id],
          )
        ).rows[0];
        await c.query(
          `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,'COMPENSATING_ADJUSTMENT_REJECTED','compensating_adjustment',$4,$5)`,
          [newId('aud'), r.actor!.id, r.actor!.merchantId, rejected.id, { reason }],
        );
        return rejected;
      });
    },
  );
  app.get(
    '/v1/ledger/integrity',
    { preHandler: [auth, requirePermission('ledger:integrity')] },
    async (r) => {
      const x = await db.query(
        `SELECT j.id,j.source_type,j.source_id,count(p.id)::int posting_count,count(DISTINCT p.currency)::int currency_count,coalesce(sum(CASE p.direction WHEN 'DEBIT' THEN p.amount_minor ELSE -p.amount_minor END),0)::text imbalance_minor FROM journal_entries j LEFT JOIN journal_postings p ON p.entry_id=j.id WHERE j.merchant_id=$1 GROUP BY j.id HAVING count(p.id)<2 OR count(DISTINCT p.currency)<>1 OR coalesce(sum(CASE p.direction WHEN 'DEBIT' THEN p.amount_minor ELSE -p.amount_minor END),0)<>0`,
        [r.actor!.merchantId],
      );
      if (x.rowCount)
        r.log.error({ failureCount: x.rowCount }, 'ledger integrity failures detected');
      return { ok: x.rowCount === 0, failures: x.rows };
    },
  );
  app.post('/v1/settlements', { preHandler: settleWrite }, async (r, p) => {
    const b = settlementPeriod.parse(r.body),
      key = z.string().min(8).max(128).parse(r.headers['idempotency-key']);
    const response = await transaction(db, async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `${r.actor!.merchantId}:${b.currency}:${b.periodStart}:${b.periodEnd}`,
      ]);
      const reconciliation = await c.query(
        `SELECT id FROM reconciliation_runs WHERE merchant_id=$1 AND reconciliation_type='PAYMENTS' AND currency=$2 AND period_start=$3 AND period_end=$4 AND status='COMPLETED' AND unmatched_count=0`,
        [r.actor!.merchantId, b.currency, b.periodStart, b.periodEnd],
      );
      if (!reconciliation.rowCount) {
        return {
          statusCode: 422,
          body: apiError(r, 'NOT_RECONCILED', 'The period is not fully reconciled.'),
        };
      }
      const totals = (
          await c.query(
            `SELECT coalesce(sum(gross_minor),0) gross,coalesce(sum(fee_minor),0) fees FROM payments WHERE merchant_id=$1 AND currency=$2 AND status IN ('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED') AND updated_at >= $3 AND updated_at < $4`,
            [r.actor!.merchantId, b.currency, b.periodStart, b.periodEnd],
          )
        ).rows[0],
        refunds = (
          await c.query(
            `SELECT coalesce(sum(amount_minor),0) amount FROM refunds r JOIN payments p ON p.id=r.payment_id WHERE r.merchant_id=$1 AND p.currency=$2 AND r.status='APPROVED' AND r.updated_at >= $3 AND r.updated_at < $4`,
            [r.actor!.merchantId, b.currency, b.periodStart, b.periodEnd],
          )
        ).rows[0].amount,
        snapshot = {
          version: 1,
          reconciliationId: reconciliation.rows[0].id,
          payoutExecuted: false,
        };
      const values = [
        newId('stl'),
        r.actor!.merchantId,
        b.currency,
        b.periodStart,
        b.periodEnd,
        totals.gross,
        refunds,
        totals.fees,
        (BigInt(totals.gross) - BigInt(refunds) - BigInt(totals.fees)).toString(),
        snapshot,
        evidenceHash(snapshot),
        r.actor!.id,
        key,
      ];
      try {
        const created = await c.query(
          `INSERT INTO settlement_batches(id,merchant_id,currency,period_start,period_end,gross_minor,refunds_minor,fees_minor,net_minor,input_snapshot,input_sha256,created_by,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(merchant_id,idempotency_key) DO UPDATE SET idempotency_key=excluded.idempotency_key RETURNING *`,
          values,
        );
        return { statusCode: 201, body: viewBatch(created.rows[0]) };
      } catch (e: any) {
        if (e.code === '23505') {
          return {
            statusCode: 409,
            body: apiError(
              r,
              'DUPLICATE_SETTLEMENT',
              'This merchant period and currency already has a settlement.',
            ),
          };
        }
        throw e;
      }
    });
    p.code(response.statusCode);
    return response.body;
  });
  app.get('/v1/settlements', { preHandler: settleRead }, async (r) => {
    const q = page.parse(r.query),
      x = await db.query(
        `SELECT *,count(*) OVER() total FROM settlement_batches WHERE merchant_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,
        [r.actor!.merchantId, q.pageSize, (q.page - 1) * q.pageSize],
      );
    return {
      data: x.rows.map(viewBatch),
      page: q.page,
      pageSize: q.pageSize,
      total: Number(x.rows[0]?.total ?? 0),
    };
  });
  app.get('/v1/settlements/:id', { preHandler: settleRead }, async (r, p) => {
    const x = await db.query('SELECT * FROM settlement_batches WHERE id=$1 AND merchant_id=$2', [
      (r.params as any).id,
      r.actor!.merchantId,
    ]);
    return x.rowCount
      ? viewBatch(x.rows[0])
      : p.code(404).send(apiError(r, 'NOT_FOUND', 'Settlement not found.'));
  });
  app.post('/v1/settlements/:id/submit', { preHandler: settleWrite }, async (r, p) => {
    const x = await db.query(
      `UPDATE settlement_batches SET status='AWAITING_APPROVAL',submitted_at=coalesce(submitted_at,now()) WHERE id=$1 AND merchant_id=$2 AND status IN ('DRAFT','AWAITING_APPROVAL') RETURNING *`,
      [(r.params as any).id, r.actor!.merchantId],
    );
    return x.rowCount
      ? viewBatch(x.rows[0])
      : p.code(409).send(apiError(r, 'STATE_CONFLICT', 'Settlement cannot be submitted.'));
  });
  app.post(
    '/v1/settlements/:id/approve',
    { preHandler: [auth, requirePermission('settlements:approve'), mutate] },
    async (r, p) =>
      transaction(db, async (c) => {
        const x = await c.query(
          'SELECT * FROM settlement_batches WHERE id=$1 AND merchant_id=$2 FOR UPDATE',
          [(r.params as any).id, r.actor!.merchantId],
        );
        if (!x.rowCount) {
          p.code(404);
          return apiError(r, 'NOT_FOUND', 'Settlement not found.');
        }
        if (x.rows[0].created_by === r.actor!.id) {
          p.code(409);
          return apiError(
            r,
            'MAKER_CHECKER_REQUIRED',
            'The creator cannot approve this settlement.',
          );
        }
        if (['APPROVED', 'EXPORTED'].includes(x.rows[0].status)) return viewBatch(x.rows[0]);
        if (x.rows[0].status !== 'AWAITING_APPROVAL') {
          p.code(409);
          return apiError(r, 'STATE_CONFLICT', 'Settlement is not awaiting approval.');
        }
        const approved = (
          await c.query(
            `UPDATE settlement_batches SET status='APPROVED',approved_by=$1,approved_at=now() WHERE id=$2 RETURNING *`,
            [r.actor!.id, x.rows[0].id],
          )
        ).rows[0];
        return viewBatch(approved);
      }),
  );
  app.post('/v1/settlements/:id/cancel', { preHandler: settleWrite }, async (r, p) => {
    const key = z.string().min(8).max(128).parse(r.headers['idempotency-key']);
    return transaction(db, async (c) => {
      const current = await c.query(
        `SELECT * FROM settlement_batches WHERE id=$1 AND merchant_id=$2 FOR UPDATE`,
        [(r.params as any).id, r.actor!.merchantId],
      );
      if (!current.rowCount) {
        p.code(404);
        return apiError(r, 'NOT_FOUND', 'Settlement not found.');
      }
      if (current.rows[0].status === 'CANCELLED') {
        if (current.rows[0].cancellation_idempotency_key === key) return viewBatch(current.rows[0]);
        p.code(409);
        return apiError(r, 'STATE_CONFLICT', 'Settlement is already cancelled.');
      }
      if (!['DRAFT', 'AWAITING_APPROVAL'].includes(current.rows[0].status)) {
        p.code(409);
        return apiError(
          r,
          'STATE_CONFLICT',
          'Approved or exported settlements cannot be cancelled.',
        );
      }
      const cancelled = (
        await c.query(
          `UPDATE settlement_batches SET status='CANCELLED',cancelled_at=now(),cancelled_by=$1,cancellation_idempotency_key=$2 WHERE id=$3 RETURNING *`,
          [r.actor!.id, key, current.rows[0].id],
        )
      ).rows[0];
      await c.query(
        `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'SANDBOX_SETTLEMENT_CANCELLED','settlement',$4)`,
        [newId('aud'), r.actor!.id, r.actor!.merchantId, cancelled.id],
      );
      return viewBatch(cancelled);
    });
  });
  app.post('/v1/settlements/:id/export', { preHandler: settleWrite }, async (r, p) =>
    transaction(db, async (c) => {
      const x = await c.query(
        'SELECT * FROM settlement_batches WHERE id=$1 AND merchant_id=$2 FOR UPDATE',
        [(r.params as any).id, r.actor!.merchantId],
      );
      if (!x.rowCount) {
        p.code(404);
        return apiError(r, 'NOT_FOUND', 'Settlement not found.');
      }
      if (!['APPROVED', 'EXPORTED'].includes(x.rows[0].status)) {
        p.code(409);
        return apiError(r, 'STATE_CONFLICT', 'Only approved settlements can be exported.');
      }
      const csv = settlementCsv({
          settlementId: x.rows[0].id,
          reconciliationId: x.rows[0].input_snapshot.reconciliationId,
          currency: x.rows[0].currency,
          periodStart: new Date(x.rows[0].period_start).toISOString(),
          periodEnd: new Date(x.rows[0].period_end).toISOString(),
          grossMinor: x.rows[0].gross_minor,
          refundsMinor: x.rows[0].refunds_minor,
          feesMinor: x.rows[0].fees_minor,
          netMinor: x.rows[0].net_minor,
        }),
        filename = `giantpay-sandbox-settlement-${x.rows[0].id}.csv`,
        hash = createHash('sha256').update(csv).digest('hex');
      const createdExport = await c.query(
        `INSERT INTO settlement_exports(id,batch_id,merchant_id,filename,content_sha256,created_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(batch_id) DO NOTHING`,
        [newId('sex'), x.rows[0].id, r.actor!.merchantId, filename, hash, r.actor!.id],
      );
      await c.query(
        `UPDATE settlement_batches SET status='EXPORTED',exported_at=coalesce(exported_at,now()) WHERE id=$1`,
        [x.rows[0].id],
      );
      if (createdExport.rowCount)
        await c.query(
          `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,'SANDBOX_SETTLEMENT_EXPORTED','settlement',$4,$5)`,
          [newId('aud'), r.actor!.id, r.actor!.merchantId, x.rows[0].id, { contentSha256: hash }],
        );
      p.header('Content-Type', 'text/csv; charset=utf-8').header(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return csv;
    }),
  );
}
