# PR 28 final security and correctness review

Reviewed original head `64c5448afe4f897629befef69874ac3825bdf935` against fetched
main `0634ba45fe07568c01633a1ad34287b3edab461b`. No AGENTS.md was present in this
checkout or checked ancestors. The publishing checkout was clean; the original
broken worktree and unrelated resources were preserved.

## Confirmed defects corrected

1. Recovery checked its lease token only after calling the financial processor.
   A delayed verifier could therefore post after losing its lease. The processor
   now fences recovery under the payment row lock, checking both ownership and
   database wall-clock expiry before any receipt, transition, ledger or outbox
   effects. Completion updates also reject expired leases. Ordinary verified
   callbacks retain their existing behavior.
2. Retry due time was saved only after verification completed. A crash on later
   attempts allowed a retry immediately after the two-minute lease instead of
   honoring longer backoff. Due time and claim audit now commit with the attempt
   and lease. The attempt budget still caps at eight, including crash recovery.
3. Worker shutdown had no recovery cancellation or drain hook, allowing database
   closure during verification. Shutdown now stops claims, cancels verification
   through the provider HTTP transport, and drains recovery database completion
   before closing PostgreSQL. The reconciliation tick skips further observations
   after shutdown starts.

## Other paths reviewed

- The worker has no charge-initiation capability. Provider missing/error/timeout,
  failed attempts and mismatches remain unresolved and retain reservations.
- Reference discovery is followed by authoritative numeric-ID verification with
  exact reference, currency and integer minor-unit amount. An already-bound ID
  cannot be silently replaced. Provider transaction uniqueness prevents binding
  another tenant's transaction.
- Payment locks, state transitions, deterministic receipts, unique journals and
  deduplicated outbox effects remain shared with callbacks. Escalation does not
  prevent a later authoritative callback. Financial effects remain transactional.
- Claim queries now select only fields needed for verification, excluding customer
  data and hosted capability URLs. Audit contains IDs, bounded outcomes and attempt
  counts; metric dimensions are bounded. Provider messages/bodies and secrets are
  not copied into recovery logs, metrics or audit. Existing API log redaction stays
  in place. Worker startup still requires an explicit recovery flag and configured
  test-only Flutterwave provider. Live-key and payout guards remain unchanged.
- Migration 023 is unchanged from the original PR, preserving its checksum. Fresh,
  recorded-021/022 upgrade, recorded repeat and raw SQL repeat are covered. Repeat
  does not reset attempts, leases, scheduling or outcomes.

## Verification and external limits

Local verification: backend typecheck, 36 focused unit tests, 26 PostgreSQL
recovery/migration tests, earlier 64-test recovery/provider/callback suite,
OpenAPI validation, backend build/distribution and migration repeat checks passed.
The final published commit additionally requires the existing enforced
PostgreSQL/Redis suite with zero skips, frontend checks and authenticated merchant
and staff browser acceptance in CI. Final run links and counts are recorded on
PR 28 rather than treating an earlier commit's checks as final evidence.

External provider account/sandbox acceptance, production storage/scanner/SMTP,
hosted proxy/TLS behavior, egress policy, monitoring and operator rollout remain
unverified. Statement ingestion and bank/refund execution remain separate work.
Recovery remains disabled by default; live collections and payouts stay disabled.
No deployment, merge, hosted service change or email is part of this review.
