# Sandbox deployment and release engineering

Phase 11 packages the GiantPay backend for a sandbox-only VPS or managed container platform. A successful image build is not a claim of production-payment or regulatory readiness. The current shared cPanel account is incompatible because the topology requires independently supervised processes, PostgreSQL, authenticated TLS Redis, mounted secrets, health probes, and an HTTPS reverse proxy.

## Topology and prerequisites

Run one API process and separate outbox, webhook, notification, and reconciliation worker processes from the same immutable image. PostgreSQL is durable business state. Redis is authenticated, TLS-protected, replaceable operational state; loss may reset rate-limit counters and must never delete PostgreSQL truth. Use a supported OCI runtime, Node 22-compatible CPU, persistent encrypted PostgreSQL storage, a private network, a TLS Redis endpoint, a secret manager, and enough capacity for the resource limits in `deploy/compose.sandbox.yml`.

The reconciliation worker is deliberately read-only: Phase 3 reconciliation remains request-driven and the worker only observes stale runs. No worker performs real payouts. Email, SMS, external delivery, and real payouts remain disabled.

## Configuration and secrets

Set `NODE_ENV=production`, `DEPLOYMENT_ENVIRONMENT=sandbox`, `PAYMENT_PROVIDER=sandbox`, `FRONTEND_ORIGIN=https://giantpay.mw`, `COOKIE_SECURE=true`, and exact proxy CIDRs in `TRUSTED_PROXIES`. The API accepts CORS only from the configured origin; local development must explicitly use its approved local origin. `DATABASE_URL` must require certificate verification and `REDIS_URL` must use `rediss://`.

Inject `DATABASE_URL`, `REDIS_URL`, `PASSWORD_PEPPER`, `COOKIE_SECRET`, `SANDBOX_WEBHOOK_SECRET`, and `WEBHOOK_SECRET_KEY` through the corresponding `_FILE` variables and mounted secret files. Never place values in images, Compose files, logs, examples, or Git. Rotate one secret at a time through the platform secret manager, restart all processes, invalidate affected sessions or signatures, and retain old webhook decryption material only for an explicitly bounded migration window.

## Build, release, and integrity

Build from the repository root with `docker build -f server/Dockerfile --sbom=true -t giantpay-api:$RELEASE_VERSION .`. The multi-stage image installs the frozen lockfile, copies production dependencies only, runs as UID/GID 10001, drops privileges in Compose, uses a read-only root filesystem, and limits writes to `/tmp/giantpay`.

After `pnpm --dir server run build`, set `RELEASE_VERSION`, the full `GIT_SHA`, and `SOURCE_DATE_EPOCH`, then run `release:metadata` and `release:verify`. Publish the image, release manifest, SPDX inventory, and `SHA256SUMS` together. Verify the digest and checksums before rollout. The manifest records version, Git SHA, latest migration, build time, and sandbox provider posture.

## Deployment, migrations, and health

Take a verified backup, run the one-shot migration process, and require its successful exit before API or workers start. Any migration error blocks deployment. Start the API, wait for `/v1/health/ready`, then start workers and observe backlog/error metrics. `/v1/health/live` proves only process life; readiness includes bounded PostgreSQL, Redis, and shutdown state. Public health responses contain no dependency or credential detail.

TLS terminates at a controlled reverse proxy using the example configuration. Create DNS for `api.giantpay.mw` only during an separately authorized deployment. Forward headers only from CIDRs listed in `TRUSTED_PROXIES`; never trust arbitrary client forwarding headers.

SIGTERM/SIGINT withdraw readiness, stop claims, drain active HTTP and worker work within `GRACEFUL_SHUTDOWN_TIMEOUT_MS`, release leases through their bounded expiry behavior, close Redis/PostgreSQL, and force exit only after the deadline. Scale API replicas horizontally; scale workers conservatively because database locks coordinate claims. Monitor request errors, latency, 429s, dependency health, worker leases/retries, and outbox backlog without identity labels.

## Rollback, backup, and incident recovery

Roll back application images by verified digest only when the prior version is schema-compatible. Never reverse or delete financial, ledger, audit, or outbox history. Irreversible migrations require a forward corrective migration, not destructive down-migration. Stop workers before containment, keep the API unready when dependencies cannot be verified, preserve evidence, and follow the incident-response and key-rotation runbooks.

Automate encrypted PostgreSQL backups, retention, access logging, and integrity checks. At least quarterly, perform a restore drill into an isolated environment: verify checksums, restore, apply remaining migrations, confirm migration repeat applies zero, run integrity queries, and record recovery-point and recovery-time evidence. Redis is rebuilt rather than restored unless a platform-specific operational requirement says otherwise.

Remaining external dependencies include provisioned compute, DNS/TLS authorization, managed PostgreSQL and Redis, secret management, image registry/signing, monitoring/alerting, backup storage and restore drills, provider contracts, production email/SMS, live payment/payout integrations, regulatory review, and operational staffing.
