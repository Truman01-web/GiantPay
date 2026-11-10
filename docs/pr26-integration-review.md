# PR 26 integration review

Original CI was green, including 384 enforced backend tests with zero skips on PostgreSQL 17 and Redis 8. Review added 17 database-backed tests and reproduced two defects: a second verified transaction ID was acknowledged after payment success, and pre-022 checkout retries were rejected. Both are fixed with regression coverage.

Local enforced suite: **401 passed, zero skips** using dedicated disposable PostgreSQL 17 and Redis 8 containers. The focused migration/checkout suite also passed all 17 tests. Coverage includes fresh migration/repeat, recorded 021-to-022 upgrade preserving data, direct 022 repeat, verification failures/retries, ambiguous initiation, concurrent QR submissions, amount bounds, duplicate webhook/redirect callbacks, conflicting transaction IDs, callback/initiation races and legacy retries.

Authenticated browser tests use real local merchant/staff frontends, API, PostgreSQL and Redis with synthetic users and signed sandbox callbacks. External delivery and payouts remain disabled. Run `pnpm run e2e:api` with disposable `TEST_DATABASE_URL` and `TEST_REDIS_URL`. Windows uses installed Edge; backend CI installs Chromium and runs the acceptance tests.

Typechecks, lint, OpenAPI validation and backend build/distribution checks pass. Three existing React Hook Form compiler warnings remain. Provider sandbox acceptance, Malawi account/channel approval, provider refund execution, bank integration and unattended reconciliation remain external or implementation blockers. No merge or deployment was performed.

Browser acceptance also reproduced a QR creation defect: an omitted optional Maximum Payments field became NaN through valueAsNumber and prevented form submission. Blank input now maps to undefined; the browser scenario deliberately leaves it blank.
