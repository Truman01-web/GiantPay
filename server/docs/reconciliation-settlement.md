# Sandbox reconciliation and settlement operations

These controls operate only on GiantPay's internal sandbox records. No provider, bank,
card-network, mobile-money, or payout connection exists. `EXPORTED` means that a bounded
CSV statement was generated; `externalTransferExecuted` is always `false`.

## Reconciliation

Runs are merchant-, provider-, currency-, type-, and UTC-period scoped. For Malawi daily
operations, pass explicit boundaries for `Africa/Blantyre` (`UTC+02:00`, without daylight
saving changes) and retain the requested business date in the immutable snapshot. Source
records are canonicalized, sorted, and SHA-256 hashed. Matching uses exact provider and
internal references, integer minor units, currency, state, event time, ledger posting,
and outbox evidence. Fuzzy matching is never used.

Exceptions are classified evidence records. Operators may move `OPEN` to
`UNDER_REVIEW`, then `RESOLVED` or `DISMISSED`. Terminal records and original evidence
are immutable; resolution requires a reason and evidence reference. Every retry needs a
stable `Idempotency-Key`. Material correction creates an awaiting-approval adjustment;
a different authorized user approves the append-only reversal entry or rejects the
proposal without posting ledger effects.

Alert recommendations: investigate any ledger imbalance immediately, reconciliation
runs still `RUNNING` after 15 minutes, repeated scope conflicts above five per hour, or
unmatched counts that remain nonzero after the next source-delivery window. Logs and
metrics use public run IDs and counts, never source payloads or merchant-sensitive labels.

## Sandbox settlements

A settlement can be created only for a completed, exception-free payment reconciliation
with the exact merchant, currency, and UTC period. Gross, approved refunds, existing
recorded fees, and net values use integer minor units. No new fee, reserve, tax, or
provider deduction is invented. PostgreSQL prevents duplicate scopes.

Lifecycle: `DRAFT -> AWAITING_APPROVAL -> APPROVED -> EXPORTED`, or a draft/awaiting
batch may become `CANCELLED`. The creator cannot approve. Approved calculations cannot
change. Export is idempotent, formula-safe, deterministic, bounded to one summary row,
and records its SHA-256 digest and audit event.

Cancellation requires an `Idempotency-Key`; a retry with the same key returns the durable
cancelled batch without another audit event, while a different cancellation attempt is
rejected. Cancelled calculations are immutable and cannot be approved or exported.

For a failed run, use its failure summary and request ID, correct the source system, and
start a new non-overlapping scope or retry the same idempotent scope. Never edit ledger
history or reconciliation evidence directly. Database restore, compensating entries,
and material exception approval require independent operational review.
