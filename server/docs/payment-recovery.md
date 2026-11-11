# Uncertain payment recovery

Recovery is disabled by default. A separately managed reconciliation worker can
opt in with `WORKER_ROLE=reconciliation` and `PAYMENT_RECOVERY_ENABLED=true`.
Only the configured Flutterwave provider is eligible; its existing factory still
rejects live keys. Sandbox simulations cannot supply authoritative Flutterwave
success. No charges, refunds, settlements, payouts or emails are initiated here.
No hosted configuration was changed for this milestone.

The worker discovers missing numeric IDs using Flutterwave v3
[`verify_by_reference`](https://developer.flutterwave.com/reference/verify-transaction-with-tx_ref),
then uses the existing numeric-ID verifier to check ID, exact reference, currency,
integer minor-unit amount and successful status. Already-bound IDs skip discovery.
Only verified success enters the existing transactional payment processor, which
locks the payment, enforces transitions and transaction identity, posts balanced
ledger entries exactly once, updates QR/link counters and emits the existing
outbox event. The recovery receipt has deterministic identity and content.

Pending/failed provider attempts, missing records, malformed responses, timeouts,
outages and mismatches remain unresolved. They never release QR/link capacity or
authorize a new charge. A later callback can still resolve an escalated payment.
Recovery is separate from statement reconciliation and does not fabricate provider
statements or approve settlement batches.

## Scheduling and restart behavior

Migration 023 stores attempts, due time, lease token/expiry, bounded outcome and
escalation timestamp on the payment. One payment is claimed per tick using
`FOR UPDATE SKIP LOCKED`; provider I/O runs outside the claim transaction.
Payments must be at least a minute old. Leases last two minutes; verification has
a 45-second worker deadline and the real transport has a 20-second deadline per
request, including JSON consumption. Retry delays are 60, 120, 240, 480, 960,
1920, 3600 and 3600 seconds. Eight attempts exhaust the automatic budget.
Backoff is persisted in the claim transaction, so an expired lease cannot
accelerate a later retry. Claim audit evidence is committed before provider I/O.
A restart reclaims expired leases without resetting attempts. A crash on the last
attempt is escalated on reclamation without another provider request. Lease tokens
and database wall-clock expiry fence financial posting under the payment lock
and completion updates; callback races use the shared payment lock and ledger
uniqueness. A crash after a successful posting leaves the terminal payment outside
the claim query. It cannot post again.

The existing approved `PAYMENT_CREATION_PAUSED` control also pauses automatic
recovery claims, and a control-store error fails closed. Stop the worker or disable
the flag to stop future claims. Shutdown cancels verification (including the real
HTTP transport), stops claims and drains recovery database work before closing
PostgreSQL. An interrupted claim remains recoverable after both lease expiry and
its persisted due time.

## Operator queue and evidence

`worker_jobs_total{worker=payment_recovery,outcome=...}` exposes bounded outcomes
through the existing protected metrics endpoint. Audit actions are
`PAYMENT_RECOVERY_CLAIMED`, `PAYMENT_RECOVERY_CHECKED` and
`PAYMENT_RECOVERY_ESCALATED`, with only attempt
count and bounded outcome. Provider bodies, exception messages, customer details,
checkout URLs and secrets are never included. Audit and schedule updates commit
together. Existing payment/ledger audit and outbox evidence is retained.

Authorized operators can inspect this durable queue in their existing database
review process; no public or merchant recovery mutation endpoint is added:

```sql
SELECT id, merchant_id, status, recovery_attempts, recovery_next_at,
       recovery_lease_until, recovery_escalated_at, recovery_outcome
FROM payments
WHERE provider_name = 'flutterwave' AND status IN ('PROCESSING','PENDING')
ORDER BY recovery_escalated_at NULLS LAST, recovery_next_at
LIMIT 100;
```

Alert on unresolved age, escalation count and expired leases. An operator must
obtain authoritative provider evidence before any manual resolution. Do not mark
an absent record failed, re-initiate a charge or free a reservation merely because
the budget expired. This milestone deliberately provides no automatic budget reset
or manual success override. Provider sandbox/account acceptance and production
monitoring/egress configuration remain external work.
