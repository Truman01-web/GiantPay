# Deployment and rollback runbook

Before release, require the frozen install, typecheck, 15/0 migration verification, zero-skip PostgreSQL/Redis tests, OpenAPI validation, build, distribution check, and clean diff checks. Confirm provider modes remain sandbox/disabled.

Deploy one bounded cohort, observe readiness, errors, backlog, and ledger checks, then proceed. Roll back when readiness fails persistently, error or backlog thresholds breach, or integrity checks fail. Stop new claims, allow the configured grace window, deploy the last verified artifact, and verify migrations are backward-compatible. Database rollback requires an independently reviewed recovery plan; never reverse append-only evidence manually.
