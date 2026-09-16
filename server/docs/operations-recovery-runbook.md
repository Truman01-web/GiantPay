# Operations and recovery runbook

This runbook applies only to GiantPay's sandbox backend. It does not authorize real payments, payouts, provider delivery, or regulatory operations. Never place credentials, connection strings, tokens, customer contacts, private notes, or payment payloads in incidents, logs, metrics, audit metadata, or support channels.

## Database migration recovery

Stop deployments and worker claims. Preserve the failure and backup metadata. Never edit the migration ledger or an applied migration. Restore only to an isolated `_test` database, verify checksums, run migrations twice (the repeat must apply zero), run ledger checks, and obtain independent review before resuming.

## PostgreSQL outage

Readiness becomes unavailable while liveness remains minimal. Control checks fail closed. Stop claims, preserve in-flight outcomes, restore the managed database, then verify readiness, migrations, ledger, audit/outbox integrity, and the zero-skip suite.

## Redis outage

Security-sensitive rate limits fail closed and readiness reports unavailable. Never substitute process-local counters in production. Restore authenticated TLS Redis, then verify deterministic recovery and identity isolation.

## Outbox backlog and worker failure

Use the protected overview and metrics endpoints. Declare an incident when approved thresholds breach. Stop new claims when continued processing risks duplication. Confirm safe lease expiry, bounded retries, unique deduplication keys, and sandbox/disabled providers before restarting.

## Incident escalation and emergency controls

Declare and assign the incident. An authorized maker proposes the narrowest control with an expiry; a different checker approves it. Proposed, rejected, expired, forged, and stale versions have no effect. Confirm enforcement at routes, manual retry, and workers. Deactivation uses the same maker-checker path.

## Key or credential compromise

Revoke at the source, declare an incident, stop affected workers, rotate using versioned keys, revoke affected sessions or API keys, and inspect redacted evidence. Never log or transmit the compromised value. Provider, legal, and user coordination remains external.

## Backup restoration and disaster recovery

Follow the backup/restore runbook. Prove checksum validity, disposable target isolation, 15/0 migration behavior, balanced ledger state, audit/outbox integrity, and the zero-skip suite. Recovery claims require an independently observed infrastructure drill.

## Observability and alert response

Scrape metrics only through the authenticated `platform.metrics.read` boundary. Alert on readiness, errors, rate limiting, retries, terminal failures, leases, backlog count/age, dependency state, incidents, controls, and shutdown timeouts. Correlate with validated request/trace IDs, never secrets.

## Hosting constraint

The current shared cPanel account is unsuitable because it lacks Passenger/Application Manager, PostgreSQL, Redis, and supervised background workers. Production hosting requires managed processes, PostgreSQL, authenticated TLS Redis, worker supervision, secrets, backups, monitoring, and controlled deployment/rollback infrastructure.
