# Phase 9 requirement-to-test mapping

All entries refer to Phase 9 tests. `PG` is
`test/notifications.integration.test.ts`; `Redis` is
`test/notificationRateLimit.integration.test.ts`; `Migration` is migration
verification plus `test/migrationRunner.test.ts`.

| # | Requirement | Direct test |
|---:|---|---|
| 1 | Migration 014 applies | Migration: initial pass |
| 2 | Repeat applies zero | Migration: repeat pass |
| 3 | Checksum succeeds | Migration: manifest/checksum |
| 4 | Channel constraint | PG: controlled values/history |
| 5 | Category constraint | PG: controlled values/history |
| 6 | Delivery-state constraint | PG: controlled values/history |
| 7 | Template key/version unique | PG: controlled values/history |
| 8 | Used templates immutable | PG: controlled values/history |
| 9 | Notification ownership immutable | PG: controlled values/history |
| 10 | Zero-row history mutation rejected | PG: controlled values/history |
| 11 | Unauthenticated inbox denied | PG: authorization denials |
| 12 | Permissionless merchant denied | PG: authorization denials |
| 13 | Disabled merchant denied | PG: authorization denials |
| 14 | API key denied | PG: authorization denials |
| 15 | Platform denied merchant inbox | PG: authorization denials |
| 16 | Merchant denied delivery admin | PG: authorization denials |
| 17 | Permissionless platform denied | PG: authorization denials |
| 18 | Disabled platform denied | PG: authorization denials |
| 19 | Cross-user lookup is 404 | PG: inbox isolation |
| 20 | Cross-merchant lookup is 404 | PG: inbox isolation |
| 21 | Event creates one in-app record | PG: concurrent event consumption |
| 22 | Duplicate event deduplicated | PG: concurrent event consumption |
| 23 | Concurrent consumers one winner | PG: concurrent event consumption |
| 24 | Expected template version | PG: concurrent event consumption |
| 25 | Missing variable rejected | PG: restricted rendering |
| 26 | Unknown variable rejected | PG: restricted rendering |
| 27 | Unsafe content escaped | PG: restricted rendering |
| 28 | Render length enforced | PG: restricted rendering |
| 29 | Related entity recorded | PG: concurrent event consumption |
| 30 | Platform-only data absent | PG: concurrent event consumption |
| 31 | Merchant list isolated | PG: inbox isolation |
| 32 | Inbox user isolated | PG: inbox isolation |
| 33 | Unread count correct | PG: inbox isolation |
| 34 | Read excluded from count | PG: concurrent mark-read |
| 35 | Mark-read succeeds | PG: concurrent mark-read |
| 36 | Mark-read replay | PG: concurrent mark-read |
| 37 | Changed-input key conflicts | PG: concurrent mark-read |
| 38 | Concurrent mark-read one effect | PG: concurrent mark-read |
| 39 | Read-all only current user | PG: mark-all isolation |
| 40 | Read-all tenant isolation | PG: mark-all isolation |
| 41 | Preferences readable | PG: preference policy |
| 42 | Optional category disabled | PG: preference policy |
| 43 | Mandatory category protected | PG: preference policy |
| 44 | Effective override reported | PG: preference policy |
| 45 | Expected version required | PG: preference policy |
| 46 | Stale version conflicts | PG: preference policy |
| 47 | Preference retry replay | PG: preference policy |
| 48 | Changed-input retry conflicts | PG: preference policy |
| 49 | Email preference not delivery | PG: preference policy |
| 50 | SMS preference not delivery | PG: preference policy |
| 51 | In-app immediately available | PG: concurrent event consumption |
| 52 | Email disabled/sandboxed | PG: disabled adapter |
| 53 | SMS disabled/sandboxed | PG: disabled adapter policy/constraint |
| 54 | Disabled adapter no network | PG: disabled adapter |
| 55 | No false external success | PG: provider-evidence constraint |
| 56 | Worker uses SKIP LOCKED | PG: concurrent worker claims |
| 57 | Two workers cannot claim one job | PG: concurrent worker claims |
| 58 | Expired lease recovered | PG: lease recovery |
| 59 | Live lease not stolen | PG: lease recovery |
| 60 | Attempt count bounded | Tx: `uses deterministic exponential retry backoff and becomes terminal at the configured maximum` |
| 61 | Backoff deterministic | Tx: `uses deterministic exponential retry backoff and becomes terminal at the configured maximum` |
| 62 | Terminal failure not retried | Tx: `uses deterministic exponential retry backoff and becomes terminal at the configured maximum` |
| 63 | Cancelled job not delivered | PG: lease recovery excludes cancelled states |
| 64 | Attempts append-only | PG: controlled values/history |
| 65 | Manual retry permission | PG: authorization denials |
| 66 | Manual retry reason | PG: redacted delivery/retry |
| 67 | Manual retry expected state | PG: redacted delivery/retry |
| 68 | Manual retry replay | Tx: `replays identical manual retries and creates one audit, outbox, and idempotency effect` |
| 69 | Concurrent retries one winner | Tx: `serializes two concurrent manual retries with exactly one winner` |
| 70 | Retry cannot bypass disabled provider | Tx: `never lets manual retry bypass disabled email or SMS providers` |
| 71 | Audit safe metadata | PG: audit/outbox redaction |
| 72 | Audit excludes bodies | PG: audit/outbox redaction |
| 73 | Outbox excludes contacts | PG: audit/outbox redaction |
| 74 | Logs exclude secrets | PG: audit/outbox redaction |
| 75 | Platform contact masking | PG: redacted delivery/retry |
| 76 | Same-timestamp pagination | PG: cursor pagination |
| 77 | Invalid cursor rejected | PG: cursor pagination |
| 78 | Reversed dates rejected | PG: cursor pagination |
| 79 | Redis normalized 429 | Redis: endpoint rate policies |
| 80 | Rate identities isolated | Redis: endpoint rate policies |

## Dedicated rollback and concurrency tests

`Tx` is `test/notificationsTransactions.integration.test.ts`. Every rollback
test snapshots notifications, recipients, preferences, event receipts, jobs,
attempts, read history, audit events, outbox events and idempotency records.

| Requirement | Exact test name |
|---|---|
| Notification creation rollback | `rolls back notification creation from an outbox event after recipient and receipt writes` |
| Mark-one rollback | `rolls back marking one notification read after history and audit writes` |
| Mark-all rollback | `rolls back marking all notifications read after multiple history and audit writes` |
| Preference rollback | `rolls back notification-preference updates after the preference and audit writes` |
| Worker-claim rollback | `rolls back worker job claiming after the lease update` |
| Attempt-recording rollback | `rolls back delivery-attempt recording when the subsequent job update fails` |
| Lease-recovery rollback | `rolls back expired-lease recovery after the reclaimed lease write` |
| Manual-retry rollback | `rolls back manual delivery retry after the job and audit writes` |
| Backoff, maximum and terminal state | `uses deterministic exponential retry backoff and becomes terminal at the configured maximum` |
| Lease concurrency | `reclaims an expired lease exactly once while an active lease cannot be stolen` |
| Attempt concurrency | `allows exactly one worker to record an attempt and never creates duplicate attempt numbers` |
| Manual retry replay | `replays identical manual retries and creates one audit, outbox, and idempotency effect` |
| Changed-input conflict | `returns IDEMPOTENCY_CONFLICT when a manual-retry key is reused with changed input` |
| Concurrent manual retries | `serializes two concurrent manual retries with exactly one winner` |
| Disabled-provider retry | `never lets manual retry bypass disabled email or SMS providers` |

There is no delivery-cancellation mutation in the Phase 9 API. `CANCELLED` is a
worker lifecycle terminal state reserved for a future approved operational policy;
no cancellation endpoint was added merely to create a rollback test.
