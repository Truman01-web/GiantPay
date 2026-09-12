# GiantPay API

Fastify/PostgreSQL backend foundation for the GiantPay frontend. It is a
sandbox system, not a licensed payment gateway.

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Real-money execution, reconciliation, settlement, MFA and regulatory reporting
remain production stop conditions.

Security, Redis, trusted-proxy, CSRF, cookie, and browser integration requirements are
documented in [docs/security-hardening.md](docs/security-hardening.md). Production uses
Redis as the distributed rate-limit authority and will not fall back to process memory.

## Toolchain and verification

Use Node 22.19.0 (Node 20.19+ is also supported) and pnpm 10.17.1. The root
`pnpm-lock.yaml` is authoritative for both frontend and server; install from the
repository root with `pnpm install --frozen-lockfile`. Docker Desktop with WSL 2
or another working virtualization backend is required on Windows.

Start the disposable database from `server/`:

```powershell
docker compose -f docker-compose.test.yml up -d --wait
$env:TEST_DATABASE_URL='postgresql://giantpay_test:giantpay_test_password@127.0.0.1:55432/giantpay_test'
$env:DATABASE_URL=$env:TEST_DATABASE_URL
pnpm run db:verify-migrations
pnpm run test:ci
pnpm run openapi:validate
pnpm run typecheck
pnpm run build
node scripts/check-dist.mjs
docker compose -f docker-compose.test.yml down -v
```

The test guard refuses malformed URLs, databases not ending in `_test`, known
development/production names, and remote hosts unless
`ALLOW_REMOTE_TEST_DATABASE=true` is explicitly set. It never prints passwords.
CI performs the same migration, test, OpenAPI, build, compiled-test and secret
checks using isolated test-only credentials.

If Docker health checks fail on Windows, confirm Docker Desktop is running,
WSL 2 virtualization is enabled, and port 55432 is free. Do not substitute the
development database. `pnpm audit --prod` is reviewed without force upgrades;
non-breaking remediations are preferred and breaking upgrades are separately
planned and tested.

As of 2026-09-12, `pnpm audit --prod` reports no production dependency
advisories. The full audit reports two entries for the same moderate Vitest
development-server file-read issue (`vitest` and its `@vitest/mocker`
dependency). The fix requires moving from Vitest 3 to at least 4.1.11, a major
upgrade, so it is deferred for an isolated compatibility change. CI never
starts or exposes the Vitest development server.

## Payment provider boundary

`src/providers/types.ts` defines the provider-neutral interface. The only
implementation is the deterministic local sandbox provider. Configuration
rejects that provider when `NODE_ENV=production`; it has no external endpoint
or real credentials. Checkout records a payment attempt, but only a verified
provider webhook may advance its backend-confirmed status.

## Sandbox webhook

See `docs/sandbox-webhooks.md`. Set `SANDBOX_WEBHOOK_SECRET` to a development
secret of at least 32 characters and keep the default five-minute replay
window unless a test specifically requires otherwise.

For database integration tests, set `TEST_DATABASE_URL` to a non-production
PostgreSQL database. The suite creates and drops an isolated schema.

## Ledger and outbox

Verified `SUCCEEDED` webhooks atomically create an immutable, balanced journal
entry and a deduplicated outbox event. Amounts remain integer minor units.
Merchant ledger reads require `ledger:read` and never expose platform-owned
accounts. See `docs/database.md` and `docs/operations.md`.

The internal outbox publisher is deliberately not an external broker. Enable
it locally with `OUTBOX_WORKER_ENABLED=true`; production must supply an
approved publisher implementation before enabling delivery.

## Sandbox developer platform

Merchant owners with `developer.apiKeys:manage` can create, list, inspect and
revoke sandbox keys under `/v1/developer/api-keys`. Creation is the only
response containing the complete `gp_test_...` bearer credential. The database
contains a keyed HMAC verifier and masked fingerprint, never the credential.
Send it as `Authorization: Bearer gp_test_...`; its explicit scopes are checked
by the same route permission guards without inheriting browser-session access.

Outbound endpoints and delivery history are under `/v1/developer/webhooks`.
See [docs/merchant-webhook-verification.md](docs/merchant-webhook-verification.md).
This remains a sandbox foundation: it does not execute real payments or refunds
and is not production ready.
