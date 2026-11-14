# Production-readiness foundation

Phase 10 adds sandbox operational controls, private health/metrics views, incident records, bounded shutdown, and recovery checks. It does not make GiantPay production-ready.

Controls are enforced at payment-link and checkout creation, refund creation and decisions, reconciliation and settlement mutations, dispute mutations, onboarding submit/resubmit, notification manual retry, provider webhook ingestion, and outbox/webhook/notification claims. Effective state requires durable history joined to an approved request and independent approval decision. Proposed, rejected, forged, stale, disabled, and expired versions do not apply. Database failures fail closed with `OPERATIONAL_CONTROL_UNAVAILABLE`; active controls return `OPERATIONAL_CONTROL_ACTIVE` without internal details.

Metrics use registered route templates and bounded dimensions only. They cover HTTP counts/latency/status groups, normalized errors, authentication and rate-limit denials, worker outcomes, dependency checks, idempotency outcomes, incident state/severity, control decisions, backlog gauges, and shutdown state. IDs, contacts, tokens, keys, raw URLs/errors, arbitrary paths, and payloads are forbidden labels. The non-public metrics route requires a platform session and `platform.metrics.read`.

SIGTERM and SIGINT share one idempotent shutdown promise. Readiness becomes unavailable and claims stop before bounded draining. HTTP, Redis, and PostgreSQL close after draining. Shutdown metrics use bounded outcomes only.

See [operations-recovery-runbook.md](operations-recovery-runbook.md) and the [80-scenario executable matrix](production-readiness-test-matrix.md).

External providers remain disabled or sandboxed. Required external work includes provider agreements, infrastructure, monitoring, backup storage, restore drills, penetration testing, PCI assessment, legal and regulatory review, accounting approval, staffing, and business-continuity exercises.
