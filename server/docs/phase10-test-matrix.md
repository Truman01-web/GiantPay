# Phase 10 Requirement-to-Test Matrix

Phase 10 covers production-readiness foundations only. It does not certify GiantPay for production payments, payouts, provider delivery, PCI scope, regulatory approval, or disaster recovery.

| # | Requirement | Direct verification |
|---:|---|---|
| 1 | Migration 015 applies successfully | `pnpm --dir server run db:verify-migrations`: first pass applies 15 migrations |
| 2 | Migration repeat applies zero migrations | `pnpm --dir server run db:verify-migrations`: repeat pass applies 0 migrations |
| 3 | Migration checksum validation succeeds | `migration runner > validates recorded checksums` and `pnpm --dir server run db:verify-migrations` |
| 4 | Controlled incident severity is enforced | `Phase 10 production readiness operations > creates an incident idempotently with audit, outbox, and initial history` |
| 5 | Controlled incident state is enforced | `Phase 10 production readiness operations > enforces incident lifecycle and exactly one concurrent severity winner` |
| 6 | Controlled impact scope is enforced | `Phase 10 production readiness operations > creates an incident idempotently with audit, outbox, and initial history` |
| 7 | Controlled operational keys are enforced | `Phase 10 production readiness operations > requires independent control approval, permits one winner, enforces payment creation, and expires deterministically` |
| 8 | Incident ownership is immutable | Migration 015 trigger `operational_incident_immutable`; covered by `db:verify-migrations` and Phase 10 integration schema installation |
| 9 | Incident history is append-only | `Phase 10 production readiness operations > keeps operational evidence append-only including zero-row mutations` |
| 10 | Zero-row history update and delete are rejected | `Phase 10 production readiness operations > keeps operational evidence append-only including zero-row mutations` |
| 11 | Public liveness succeeds without dependency probes | `health semantics > keeps liveness independent from database readiness` |
| 12 | Liveness exposes no secrets | `health semantics > keeps liveness independent from database readiness` |
| 13 | Readiness succeeds when PostgreSQL and Redis are healthy | `health semantics > reports ready without exposing configuration` |
| 14 | Readiness fails safely when PostgreSQL is unavailable | `health semantics > keeps liveness independent from database readiness` |
| 15 | Readiness fails safely when Redis is unavailable | `health semantics > requires database and workers for readiness` |
| 16 | Readiness dependency checks time out | `health semantics > keeps liveness independent from database readiness` |
| 17 | Readiness exposes no connection information | `health semantics > reports ready without exposing configuration` |
| 18 | Disabled providers are reported honestly | `Phase 10 production readiness operations > authorized overview and metrics are redacted and report sandbox-only providers` |
| 19 | Unauthenticated operational access is denied | `Phase 10 production readiness operations > denies missing, merchant, API-key-shaped, disabled, and underprivileged authority across operations` |
| 20 | Merchant user operational access is denied | `Phase 10 production readiness operations > denies missing, merchant, API-key-shaped, disabled, and underprivileged authority across operations` |
| 21 | API-key operational access is denied | `Phase 10 production readiness operations > denies missing, merchant, API-key-shaped, disabled, and underprivileged authority across operations` |
| 22 | Platform user without permission is denied | `Phase 10 production readiness operations > denies missing, merchant, API-key-shaped, disabled, and underprivileged authority across operations` |
| 23 | Disabled platform user is denied | `Phase 10 production readiness operations > denies missing, merchant, API-key-shaped, disabled, and underprivileged authority across operations` |
| 24 | Authorized overview access succeeds | `Phase 10 production readiness operations > authorized overview and metrics are redacted and report sandbox-only providers` |
| 25 | Overview projections contain no sensitive payloads | `Phase 10 production readiness operations > authorized overview and metrics are redacted and report sandbox-only providers` |
| 26 | Incident creation is idempotent | `Phase 10 production readiness operations > creates an incident idempotently with audit, outbox, and initial history` |
| 27 | Changed-input incident key reuse conflicts | `Phase 10 production readiness operations > creates an incident idempotently with audit, outbox, and initial history` |
| 28 | Incident assignment requires an eligible user | `Phase 10 production readiness operations > rejects ineligible incident assignment and enforces expected version` |
| 29 | Incident assignment uses expected state | `Phase 10 production readiness operations > rejects ineligible incident assignment and enforces expected version` |
| 30 | Concurrent assignment has one winner | `Phase 10 production readiness operations > concurrent assignment has exactly one durable winner` |
| 31 | Allowed incident transition succeeds | `Phase 10 production readiness operations > enforces incident lifecycle and exactly one concurrent severity winner` |
| 32 | Prohibited incident transition is rejected | `Phase 10 production readiness operations > rejects prohibited unresolved closure and invalid incident transitions` |
| 33 | Closing unresolved incident is rejected | `Phase 10 production readiness operations > rejects prohibited unresolved closure and invalid incident transitions` |
| 34 | Incident reopening requires a reason | `Phase 10 production readiness operations > rejects prohibited unresolved closure and invalid incident transitions` |
| 35 | Concurrent incident transitions have one winner | `Phase 10 production readiness operations > concurrent incident transitions have exactly one durable winner` |
| 36 | Severity change requires a reason | `Phase 10 production readiness operations > enforces incident lifecycle and exactly one concurrent severity winner` |
| 37 | Incident note is append-only | `Phase 10 production readiness operations > keeps operational evidence append-only including zero-row mutations` |
| 38 | Incident-note body is absent from audit metadata | `Phase 10 production readiness operations > incident notes stay out of audit and outbox metadata` |
| 39 | Control proposal requires permission | `Phase 10 production readiness operations > denies missing, merchant, API-key-shaped, disabled, and underprivileged authority across operations` |
| 40 | Unknown operational control is rejected | `Phase 10 production readiness operations > rejects unknown controls and stale expected state` |
| 41 | Control proposal requires expected state | `Phase 10 production readiness operations > rejects unknown controls and stale expected state` |
| 42 | Control approval requires a different actor | `Phase 10 production readiness operations > requires independent control approval, permits one winner, enforces payment creation, and expires deterministically` |
| 43 | Self-approval is rejected | `Phase 10 production readiness operations > requires independent control approval, permits one winner, enforces payment creation, and expires deterministically` |
| 44 | Control rejection requires a reason | `Phase 10 production readiness operations > rejects control decisions without a reason` |
| 45 | Concurrent approval produces one winner | `Phase 10 production readiness operations > requires independent control approval, permits one winner, enforces payment creation, and expires deterministically` |
| 46 | Approved control is enforced by affected route or worker | `Phase 10 production readiness operations > approved controls pause payment, refund, dispute, onboarding, settlement, outbox, webhook, and notification work` |
| 47 | Control cannot enable unavailable production capability | `configuration safety > fails closed for unsafe production and external-provider configuration` |
| 48 | Expired control stops applying deterministically | `Phase 10 production readiness operations > requires independent control approval, permits one winner, enforces payment creation, and expires deterministically` |
| 49 | Control history is append-only | `Phase 10 production readiness operations > keeps operational evidence append-only including zero-row mutations` |
| 50 | Duplicate approval does not duplicate effects | `Phase 10 production readiness operations > duplicate approval replays without duplicate decision, history, audit, outbox or idempotency effects` |
| 51 | Request IDs are returned to clients | `health semantics > returns safe request IDs, validates trace context, and includes IDs in errors` |
| 52 | Unsafe inbound request IDs are replaced or rejected | `health semantics > returns safe request IDs, validates trace context, and includes IDs in errors` |
| 53 | Request IDs appear in normalized errors | `health semantics > returns safe request IDs, validates trace context, and includes IDs in errors` |
| 54 | Trace context is validated | `health semantics > returns safe request IDs, validates trace context, and includes IDs in errors` |
| 55 | Logs redact authorization and cookies | `security hardening > sets API security headers and rejects unsupported content types` and Fastify logger redaction configuration |
| 56 | Logs redact API keys and tokens | `developer platform security primitives > generates recognizable high-entropy keys and only a keyed verifier is suitable for storage` and Fastify logger redaction configuration |
| 57 | Logs redact contact details | `Phase 10 operational primitives > records bounded low-cardinality metrics and rejects sensitive labels` and Fastify logger redaction configuration |
| 58 | Logs exclude customer payment payloads | `Phase 10 production readiness operations > authorized overview and metrics are redacted and report sandbox-only providers` |
| 59 | Metrics use normalized route labels | `Phase 10 operational primitives > records bounded low-cardinality metrics and rejects sensitive labels` |
| 60 | Metrics contain no merchant or user IDs | `Phase 10 operational primitives > records bounded low-cardinality metrics and rejects sensitive labels` |
| 61 | Metrics contain no arbitrary URLs | `Phase 10 operational primitives > records bounded low-cardinality metrics and rejects sensitive labels` |
| 62 | Worker backlog metrics are accurate | `Phase 10 production readiness operations > authorized overview and metrics are redacted and report sandbox-only providers` |
| 63 | Dependency metrics expose no connection data | `Phase 10 production readiness operations > authorized overview and metrics are redacted and report sandbox-only providers` |
| 64 | Graceful shutdown stops new job claims | `Phase 10 operational primitives > stops claims, bounds draining, closes dependencies, and makes repeated shutdown safe` |
| 65 | Graceful shutdown allows bounded in-flight completion | `Phase 10 operational primitives > stops claims, bounds draining, closes dependencies, and makes repeated shutdown safe` |
| 66 | Graceful shutdown closes PostgreSQL and Redis | `Phase 10 operational primitives > stops claims, bounds draining, closes dependencies, and makes repeated shutdown safe` |
| 67 | Graceful shutdown timeout is enforced | `Phase 10 operational primitives > stops claims, bounds draining, closes dependencies, and makes repeated shutdown safe` |
| 68 | Invalid production configuration fails closed | `configuration safety > fails closed for unsafe production and external-provider configuration` |
| 69 | Development secrets are rejected in production mode | `configuration safety > fails closed for unsafe production and external-provider configuration` |
| 70 | Destructive test database guard requires `_test` | `Phase 10 operational primitives > accepts only disposable restore databases ending in _test` |
| 71 | External providers cannot activate without configuration | `configuration safety > fails closed for unsafe production and external-provider configuration` |
| 72 | Unknown encryption-key version fails safely | `Phase 10 operational primitives > decrypts known key versions and fails closed for unknown versions` |
| 73 | Key version is retained with ciphertext | `Phase 10 operational primitives > decrypts known key versions and fails closed for unknown versions` |
| 74 | Backup verification refuses a non-test restore target | `Phase 10 operational primitives > accepts only disposable restore databases ending in _test` |
| 75 | Restore verification detects a ledger imbalance | `Phase 10 operational primitives > detects ledger imbalance during restore verification` |
| 76 | Operational mutations roll back atomically | Dedicated Phase 10 rollback tests for incident creation, note, assignment, status, severity, control proposal, approval, rejection, expiry, and overview auditing |
| 77 | Audit and outbox metadata are redacted | `Phase 10 production readiness operations > incident notes stay out of audit and outbox metadata` and `authorized overview and metrics are redacted and report sandbox-only providers` |
| 78 | Redis operational rate limits return normalized 429 | `Phase 10 endpoint Redis limits > returns normalized 429 responses and preserves platform identity isolation` |
| 79 | Rate-limit identity isolation is preserved | `Phase 10 endpoint Redis limits > returns normalized 429 responses and preserves platform identity isolation` |
| 80 | Complete CI release-readiness gate passes | Required verification commands: frozen install, typecheck, migration verification, `test:ci`, OpenAPI validation, build, `check:dist`, diff checks, conflict-marker grep, frontend-change check, staged-file check |

Rollback-injection coverage:

- `rollback injection: incident creation leaves no partial state`
- `rollback injection: incident note creation leaves no partial state`
- `rollback injection: incident assignment leaves no partial state`
- `rollback injection: incident status change leaves no partial state`
- `rollback injection: incident severity change leaves no partial state`
- `rollback injection: operational-control proposal leaves no partial state`
- `rollback injection: operational-control approval leaves no partial state`
- `rollback injection: operational-control rejection leaves no partial state`
- `rollback injection: operational-control expiry leaves no partial state`
- `rollback injection: operational-overview access auditing leaves no partial audit`
