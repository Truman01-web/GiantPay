# Phase 13 merchant workflow contract matrix

The implemented backend routes and `server/openapi/giantpay-v1.yaml` are authoritative. MSW is a test/local-development transport only. A gap is never filled with mock data in real mode.

| Feature | Frontend service | Backend route | Auth / permission | Contract, pagination and idempotency | Status |
|---|---|---|---|---|---|
| Registration | `authApi.register` | `POST /v1/auth/register` | Public; rate limited | Business name, email, password, Malawi phone; enumeration-safe acceptance | Compatible |
| Login/session/logout | `authApi.login/getSession/logout` | `/v1/auth/login`, `/v1/auth/session`, `/v1/auth/logout` | Cookie session; CSRF on authenticated mutation | Session + CSRF; logout 204 | Compatible; StrictMode covered |
| MFA | `authApi.verifyMfa` | `POST /v1/auth/mfa/verify` | Public challenge; rate limited | Challenge ID + TOTP; returns session + CSRF | Verify compatible; mock-era resend has no backend route |
| Verification/recovery | `authApi.verifyEmail/forgotPassword/resetPassword` | `/v1/auth/email/verify`, `/v1/auth/password/*` | Public; rate limited | Enumeration-safe forgot response; token reset | Compatible; external delivery disabled |
| Dashboard | `dashboardApi` | `/v1/dashboard/summary`, `/v1/dashboard/volume` | Merchant session | Minor-unit sandbox aggregates and UTC points | Compatible |
| Payments | `paymentsApi` | `/v1/payments`, `/v1/payments/:id[/events]` | `payments:read`; scoped API key where allowed | Backend money objects; page/pageSize | Compatible |
| Checkout | `checkoutApi` | `/v1/checkout/:token[/submit]`, `/v1/payment-status/:reference` | Public sandbox checkout | Trusted status; submit requires `Idempotency-Key` | Compatible |
| Payment links | `paymentLinksApi` | `/v1/payment-links*` | read/manage permissions | Page/pageSize; create idempotent | Compatible |
| Refunds | `refundsApi` | `/v1/refunds*` | read/request permissions | Backend ceiling and maker-checker state; create idempotent | Compatible |
| Refund approval | `adminApi` | `/v1/admin/refunds/*` | Platform refund permission | Controlled decision | UI intentionally unavailable pending platform adapter |
| Reconciliation | `reconciliationApi` | `/v1/reconciliation/runs*`, `/exceptions*`, `/exceptions/:id/review`, `/adjustments*`, `/ledger/integrity` | `reconciliation:read/manage/approve`, `ledger:integrity` | Separate exception fetches; review and adjustment proposal use fresh idempotency keys; maker-checker remains server enforced | Phase 13 contract adapter completed; adjustment controls are service-ready but not exposed as full screens |
| Settlements | `settlementsApi` | `/v1/settlements*` | `settlements:read/manage/approve` | Integer minor-unit strings; sandbox-only batches; create/cancel idempotent; independent approval server enforced | Phase 13 contract and read screens aligned; full action UI remains pending |
| Onboarding | `merchantsApi` | Granular `/v1/merchants/onboarding/*` | `onboarding:read/write/submit` | Route methods cover profile, principals, questionnaire `2026-01`, evidence metadata, submit, information response, resubmit and history | Partial: granular route methods are available, but complete snapshot adaptation and wizard UI for every section remain pending |
| Team/roles | `teamApi` | `/v1/team/*`, `/v1/roles*` | team/role permissions | Backend role IDs and `data` pages | Backend supported; UI intentionally unavailable pending adapter |
| API keys | `developersApi` | `/v1/developer/api-keys*` | `developer.apiKeys:manage` | `payments:read` scope; plaintext key once | Adapter implemented |
| Webhooks | `developersApi` | `/v1/developer/webhooks*` | `developer.webhooks:manage` | Name, HTTPS URL, backend event enum; secret once | Adapter implemented |
| Reports | `reportsApi` | `/v1/reports/summary`, `/v1/report-exports*` | report permissions | String minor units; page/pageSize; export idempotent | Adapter implemented |
| Support | `supportApi` | `/v1/support/cases*` | support permissions | Backend categories/status; limit/cursor; mutations idempotent | Backend supported; UI intentionally unavailable pending cursor UI |
| Platform administration | `adminApi` | compliance and `/v1/platform/*` | Platform session + explicit permissions | Maker-checker and operation-specific pagination | Partly supported; screens remain unavailable, never mocked in real mode |

## Known implementation/OpenAPI differences

- Phase 7-11 team, support, operations, dispute and notification routes are implemented and integration-tested but are not yet comprehensively represented in OpenAPI. OpenAPI must be expanded before treating them as a public contract.
- Secure binary evidence storage is not configured. Real mode registers metadata only and explicitly rejects the legacy upload action; it never fabricates upload success.
- Customer-entered payment links remain planned because the backend accepts fixed amounts only. Date-only expiry values are converted from local end-of-day to ISO UTC.
- TOTP challenges cannot be resent. Registration and password recovery state only that requests were accepted because external email delivery is disabled.
- API keys currently expose only the backend-declared `payments:read` sandbox scope.
- External email/SMS, real payouts and live payment providers remain disabled.

## Deployed sandbox configuration

```text
VITE_APP_ENV=sandbox
VITE_USE_MOCK_API=false
VITE_API_URL=https://api.giantpay.mw
```

This is the intended non-secret configuration, not a claim that DNS, TLS or the API deployment is live.
