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

Provider callbacks, real-money execution, ledger posting, reconciliation,
settlement, MFA and regulatory reporting remain production stop conditions.

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
