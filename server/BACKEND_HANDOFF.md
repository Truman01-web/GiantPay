# GiantPay backend handoff

George Mustafa Taumbe — Computer Engineer, Systems and Business Analyst — implemented the backend foundation in the isolated `server/` directory. No frontend source under `src/` was changed.

## Start locally

```bash
cd server
cp .env.example .env
# Replace the placeholder secrets in .env.
docker compose up -d postgres
npm ci
npm run db:migrate
npm run dev
```

Set the frontend environment to:

```text
VITE_API_URL=http://127.0.0.1:4000
VITE_ENABLE_MSW=false
```

The API health check is `GET http://127.0.0.1:4000/v1/health`. The shared request/response contract is `server/openapi/giantpay-v1.yaml`.

## Merge coordination

- Truman owns frontend code in `src/`.
- George owns backend code in `server/`.
- Asher reviews the API contract, requirements, workflow and acceptance criteria.
- Rebase each feature branch on the latest integration branch before opening a pull request.
- Keep commits small and scoped; do not commit `.env`, `node_modules`, `build` or `dist`.
- Any API shape change must update the OpenAPI file in the same commit and be agreed before either side implements it.

## Known contract decision

`CUSTOMER_ENTERED` payment links are deliberately rejected for now because the current checkout submit request contains no amount. Truman and George should add and validate `amountMinor` together before enabling this mode.

## Production stop conditions

The included provider is a sandbox simulator and configuration forbids it in production. Do not process real money or customer financial data until approved provider contracts, signed callbacks, KYC/KYB storage, MFA, maker–checker refund execution, ledger/reconciliation workers, observability, security testing and applicable regulatory approvals are complete.
