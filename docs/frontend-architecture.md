# GiantPay Frontend — Architecture

## 0. Status of this document

Written at project start, in an **empty repository** with no existing frontend
code, no OpenAPI spec / backend API contract, and no supplied brand assets
(the official GiantPlus/GiantPay PNG logo will be added by the product owner
under `src/assets/brand/`). Everything described below is therefore a
**greenfield build against a mocked backend** (MSW), structured so that
pointing `VITE_API_URL` at a real GiantPay backend — once its contract is
available — requires no rewrite, only replacing mock handlers with real
network calls that already match the typed service layer's shape.

Delivery is phased (see §8). This pass ("Foundation + Merchant Core") builds
the full application shell plus one deep, production-quality vertical slice:
**authentication → onboarding → dashboard → transactions → payment links →
refunds**. Admin console, developer portal, team/support, settlements,
reconciliation and reports are scaffolded as routed, permission-gated stubs
with a clear "not yet implemented" state — never faked as working — and are
the subject of the next phase.

## 1. Technology baseline

| Concern | Choice |
|---|---|
| Framework | React 19 + TypeScript 6.0 (strict; see note below on the 6.x pin) |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 (CSS-first config, design tokens as CSS variables) |
| Routing | React Router 7 (data router, lazy route modules) |
| Server state | TanStack Query 5 |
| Form state | React Hook Form 7 + Zod 4 |
| Accessible primitives | Radix UI primitives, shadcn/ui-style composition |
| Icons | lucide-react (tree-shakeable) |
| Charts | Recharts |
| Dates | date-fns |
| Client-only global state | Zustand (UI-only: sidebar, environment toggle) |
| HTTP | native `fetch` behind one typed client (`services/api/client.ts`) |
| Mocking | MSW (browser worker in dev, node server in tests) |
| Unit/component tests | Vitest + React Testing Library |
| E2E tests | Playwright |
| Lint/format | ESLint (flat config) + Prettier |
| Package manager | pnpm |

Note: TypeScript's latest published stable release at build time is 7.0.x
(the native/Go-ported compiler), but `typescript-eslint` (8.69.0, itself
latest-stable) does not yet support the TS 7 compiler API — installing TS 7
breaks `pnpm lint` outright (a real, reproducible failure, not a
theoretical one). Per the spec's own "mutually compatible releases"
requirement, this build pins `typescript@^6.0.3` — the latest release still
supported by the lint toolchain — rather than chasing the newest major
version at the cost of a broken lint pipeline. Revisit this pin once
typescript-eslint ships TS 7 support (tracked upstream at
typescript-eslint/typescript-eslint#10940, referenced in the TS7 error
message).

## 2. Directory structure

```
src/
  app/            # composition root: providers, router, theme, config
  assets/brand/   # logo + brand marks (placeholder until real PNG supplied)
  components/     # shared, business-rule-free UI (ui/, data-display/, feedback/, forms/, navigation/)
  features/       # one folder per domain: queries, mutations, schemas, components, tests
  layouts/        # PublicLayout, AuthLayout, MerchantLayout, AdminLayout, CheckoutLayout
  pages/          # route entry points; compose features, no networking logic
  services/api/   # one typed client per backend resource
  services/auth/  # session + permission helpers
  mocks/          # MSW handlers + fixtures (Malawi-realistic demo data)
  hooks/          # cross-feature hooks
  lib/            # framework glue (query client, money math, etc.)
  types/          # shared TS types (roles, permissions, money, pagination)
  utils/          # pure helpers
  tests/          # test setup, shared test utilities
```

Rules enforced throughout: pages never call `fetch` directly; all network
access goes through `services/api/*`; shared `components/` contain no
GiantPay business rules (a `StatusBadge` knows how to render a status enum,
not which statuses a refund can transition through — that lives in
`features/refunds`); money is handled as **integer minor units** end-to-end,
never floating point.

## 3. State ownership

- **Remote/server data** → TanStack Query, feature-owned query keys.
- **Form state** → React Hook Form + Zod resolver.
- **URL filters/pagination/search** → URL search params (`useSearchParams`).
- **Local component state** → `useState`/`useReducer`.
- **Cross-page client-only state** → Zustand, limited to: sidebar collapsed,
  active environment (sandbox/production), toast queue is handled by a
  dedicated toast store since it must survive route changes.
- **Auth, permissions, financial state** → backend is authoritative. The
  frontend never infers a payment/refund/settlement outcome from anything
  other than a trusted GET to the backend (see `docs/frontend-security.md`).

## 4. Routing & access control

Route tree, guard behavior and the permission model are documented in
`docs/frontend-routes.md`. Summary: three route groups (`public`, `merchant`,
`admin`) each behind their own layout; a `RequireAuth` guard and a
`RequirePermission` guard compose per-route; unknown/forbidden access renders
a real 403 page, never a silent redirect that could be mistaken for "page
doesn't exist" (which would leak information) nor a fake-success UI.

## 5. API layer

See `docs/frontend-api-map.md` for the endpoint-by-endpoint mapping (real vs.
mocked in this pass) and `docs/frontend-security.md` for the trust boundary
rules (no optimistic financial state, idempotency keys, cookie-based
sessions, etc.).

## 6. Design system

See `docs/design-system.md` for tokens, typography and component inventory.

## 7. Testing

See `docs/testing-strategy.md`.

## 8. Phased plan and current status

| Phase | Scope | Status |
|---|---|---|
| 0 | Discovery, docs, architecture | **Done** (this document set) |
| 1 | Foundation: tokens, shared components, routing/guards, layouts, typed API client, MSW, auth shell, error boundaries | **Done** |
| 2 | Merchant core: onboarding, dashboard, transactions, payment links, refunds | **Done** (deep slice); settlements/reconciliation/reports left as routed stubs |
| 3 | Hosted checkout | **Done** (core states: initializing/ready/submitting/requires-action/processing/pending/success/failed/expired, trusted-status polling) |
| 4 | Developer platform (API keys, webhooks, docs) | Routed stub only — next phase |
| 5 | Team & support | Routed stub only — next phase |
| 6 | Administration & operations | Routed stub only — next phase |
| 7 | Production hardening (full a11y audit, cross-browser, perf budget, full Playwright journey suite) | Partial — core flows covered; full audit is next phase |

Known risks and remaining backend requirements are tracked in `HANDOVER.md`
at the repository root, updated at the end of each phase.
