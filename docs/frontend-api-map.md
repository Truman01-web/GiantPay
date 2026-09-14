# GiantPay Frontend — API Map

No OpenAPI specification or backend contract exists in this repository. All
endpoints below are **modeled from the product spec** and implemented as
typed service functions in `services/api/*` backed by MSW handlers in
`mocks/handlers/*` with matching shapes. Switching to a real backend is a
matter of setting `VITE_API_URL` and `VITE_USE_MOCK_API=false` — the typed
service layer, React Query hooks, and components do not change.

**Every one of these must be reconciled against the real API contract before
production.** Fields, enum values and status names in particular are
best-effort per the spec, not guaranteed to match the backend exactly.

## Conventions

- Base path: `${VITE_API_URL}/v1`
- Auth: cookie session (`credentials: 'include'`); no bearer tokens handled
  by the frontend.
- Pagination: `?page=&pageSize=` request, `{ data, page, pageSize, total }`
  response.
- Idempotency: `Idempotency-Key` header on POST for financial resources.
- Errors: `{ error: { code, message, fields?, requestId? } }`.

## Implemented (service module → mocked endpoints)

| Service module | Endpoints (mocked) |
|---|---|
| `services/api/auth.ts` | `POST /auth/login`, `POST /auth/logout`, `POST /auth/mfa/verify`, `POST /auth/mfa/resend`, `POST /auth/password/forgot`, `POST /auth/password/reset`, `POST /auth/email/verify`, `POST /auth/register`, `GET /auth/session` |
| `services/api/merchants.ts` | `GET /merchants/onboarding`, `PATCH /merchants/onboarding` (draft save), `POST /merchants/onboarding/submit`, `POST /merchants/onboarding/documents` (KYC/KYB upload) |
| `services/api/payments.ts` | `GET /payments`, `GET /payments/:id`, `GET /payments/:id/events` |
| `services/api/paymentLinks.ts` | `GET /payment-links`, `POST /payment-links`, `GET /payment-links/:id`, `PATCH /payment-links/:id` (disable) |
| `services/api/refunds.ts` | `GET /refunds`, `POST /refunds`, `GET /refunds/:id` |
| `services/api/checkout.ts` | `GET /checkout/:token`, `POST /checkout/:token/submit`, `GET /payment-status/:reference` (trusted status source) |
| `services/api/dashboard.ts` | `GET /dashboard/summary`, `GET /dashboard/volume` |
| `services/api/settlements.ts` | `GET /settlements`, `GET /settlements/:id` |
| `services/api/reconciliation.ts` | `GET /reconciliation/runs`, `GET /reconciliation/runs/:id`, `PATCH /reconciliation/runs/:runId/exceptions/:exceptionId` (status/note update) |

## Routed but not yet wired to a service

`services/api/stubs.ts` documents the intended response shape for reports,
developer platform (API keys, webhooks), team, support and admin — kept in
one file until each feature is built (as settlements and reconciliation
already were, each split into its own `services/api/<domain>.ts` module).
None are called by any page yet; pages that depend on them render the
"coming in a later phase" stub state (`FeatureComingSoon`) rather than
calling into an unimplemented function.

## Error normalization

All service calls pass through `services/api/client.ts`, which converts any
non-2xx response (or network failure) into a typed `ApiError` with
`{ code, message, fields?, requestId?, status }`, so features never branch on
raw fetch/Response objects.
