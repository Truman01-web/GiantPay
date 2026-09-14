# Sandbox reporting and operational evidence

GiantPay reports are tenant-scoped sandbox operational records. They are not bank statements, provider settlement statements, tax returns, regulatory submissions, payout instructions, or evidence that real funds moved.

## Definitions and calculations

The supported report types are transaction activity, refund activity, platform fees, merchant ledger activity, reconciliation results, and sandbox settlement summaries. Requests always include a merchant derived from authentication, one currency (`MWK` or `USD`), a report type, and a half-open UTC interval (`periodStart <= timestamp < periodEnd`). Periods must be positive and at most 93 days. Exports are rejected, never truncated, above 10,000 rows.

Summary gross is successful payment gross. Refund and fee totals remain integer minor-unit strings; merchant net is gross minus refunds minus fees. Ledger debit and credit totals come from journal postings for the merchant and currency. Reconciliation and settlement totals come from their immutable Phase 3 records. Currencies are queried and returned separately.

## Export lifecycle and recovery

`POST /v1/report-exports` is restricted to browser sessions with `reports:export`; API keys are not automatically granted export or audit access. The route takes an `Idempotency-Key`, obtains a transaction-scoped advisory lock, reads source rows in deterministic order, generates CSV in memory, and atomically persists a completed export plus exactly one requested and one completed audit event. Identical retries return the original record. Reusing a key with different canonical parameters returns `REPORT_IDEMPOTENCY_CONFLICT`. Database failures roll back the export and audit writes; operators should investigate the request ID and safely retry the same request.

Each record stores canonical request and source SHA-256 hashes, the CSV content SHA-256, exact row count, actor, UTC period, completion time, and `sandbox_only=true`. Completed exports are protected by a database update/delete trigger. Retention must therefore be implemented through a separately reviewed archival policy rather than ad-hoc deletion.

## CSV security

Columns and rows have fixed deterministic ordering. RFC-style quotes are escaped, CRLF is used, integer minor units remain decimal strings, timestamps are UTC database values, and cells beginning with spreadsheet formula sigils (including leading whitespace) are prefixed with an apostrophe. Downloads use `text/csv`, `nosniff`, and a filename made only from the report type and opaque export ID. No shared temporary files are used.

Exports exclude customers, credentials, password hashes, sessions, API-key verifiers, webhook secrets, authorization headers, encryption material, provider-only metadata, and raw internal errors.

## Tenant isolation and audit evidence

Every source, list, detail, download, and audit query includes the authenticated merchant ID in SQL. Cross-merchant export detail and download requests intentionally return 404. Owners receive `reports:read`, `reports:export`, and `audit:read` through migration 009; other existing roles are unchanged.

Audit events are append-only at the database layer. Requested and completed events occur once per durable export. Every successful download creates a separate `REPORT_DOWNLOADED` event. Audit listing supports bounded pagination and safe action, resource, actor, and UTC filters. Returned metadata is recursively stripped of password, session, authorization, API-key, verifier, secret, token, encryption, internal-error, and stack fields.

## Production stop conditions

Before production use, owners must approve retention and legal-hold schedules, privacy access/deletion handling, operator access review, monitoring and capacity for PostgreSQL/Redis, disaster recovery, and jurisdiction-specific tax/regulatory classification. Real providers, bank settlement, payouts, foreign exchange, cross-border reporting, and regulatory submission remain disabled and require separate legal, security, financial, and infrastructure approval.
