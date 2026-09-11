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
