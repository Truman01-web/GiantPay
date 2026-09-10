# GiantPay Frontend — Handover Notes

Status as of this delivery: **Phase 0–3 complete** (Foundation + Merchant
core + Hosted checkout), built against a fully mocked backend (MSW). No
real GiantPay backend, OpenAPI spec, or brand assets existed in the
repository at the start of this work — see `docs/frontend-architecture.md`
for the full phased plan and what's built vs. stubbed.

## What's actually working (verified, not assumed)

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (39 tests) and `pnpm build` all
  pass cleanly with zero errors.
- The app was run in a real headless Chromium browser (not just built) and
  the following flows were exercised end-to-end against the mock backend:
  landing page → login → MFA (code `123456`) → dashboard (stat cards +
  volume chart) → transactions list/filtering → transaction detail → payment
  link creation → hosted checkout (submit → trusted-status polling →
  success), all at both desktop (1280px) and mobile (375px) viewports.
- Playwright specs exist for the same core journeys (`e2e/`) and are wired
  to run against a mocked, minified preview build (`.env.e2e`), not the dev
  server or real production config.

## Demo accounts (mock mode only — `mocks/fixtures/session.ts`)

| Email | Password | Role | Notes |
|---|---|---|---|
| chikondi.banda@kambazapay.mw | GiantPay!Demo1 | OWNER | MFA enabled, code `123456` |
| grace.phiri@kambazapay.mw | GiantPay!Demo1 | VIEWER | No MFA, read-only permissions — use to verify permission enforcement |
| admin@giantpay.mw | GiantPay!Demo1 | PLATFORM_ADMIN | MFA enabled; admin routes are all stubs in this phase, so this account mainly demonstrates the admin shell/layout and permission gating |

These render as quick-fill buttons on `/login` whenever `VITE_USE_MOCK_API=true`.

## Completed this phase

- Full app shell: 5 layouts (Public, Auth, Merchant, Admin, Checkout), design
  tokens, ~35 shared components, typed API client + error normalization,
  route guards enforcing permissions (not just hiding nav), error
  boundaries, MSW mock layer with Malawi-realistic demo data.
- Authentication: login, MFA challenge (paste/resend/countdown), register,
  forgot/reset password, verify email, session bootstrap, logout with full
  cache clear.
- Merchant onboarding: 5-step wizard (business info, ownership, KYC/KYB
  document upload with real progress + retry, settlement config, review +
  declaration), draft autosave, application-status view once submitted.
- Dashboard: summary stats, volume chart (with accessible text summary),
  reconciliation/settlement summaries, attention queue, recent transactions.
- Transactions: filterable/paginated list (URL-persisted filters),
  responsive table + mobile card list, detail page with full event timeline.
- Payment links: list, create (fixed/customer-entered, single-use/reusable),
  detail with disable action.
- Refunds: list, request dialog enforcing the backend-confirmed refundable
  ceiling, detail page.
- Hosted checkout: session load → channel/customer form → submit → trusted
  status polling (bounded, stops on terminal/unmount) → success/pending/
  failed/expired result screens. Standalone `/payment/:reference` status
  lookup page for return-URL flows. **The frontend never marks a payment
  successful from anything other than a fresh backend status fetch** — this
  is enforced in `usePaymentStatusPolling` and covered by an e2e test that
  asserts the in-progress state is shown before success.
- Settings: profile + security (password change UI, MFA status).

## Explicitly NOT built (routed, permission-gated, honest "coming soon" stub — not faked)

- Settlements, Reconciliation, Reports (merchant-side)
- Developer platform: API keys, webhooks, documentation
- Team & roles management, Support case tracking
- Entire admin console: merchant review, refund approvals, providers, users,
  audit logs, incidents, security, system health

None of these call an unimplemented API — see `services/api/stubs.ts` for
their intended typed shape, ready to be filled in without an API-layer
redesign.

## Known risks / must reconcile before production

1. **No real backend contract exists.** Every status enum, permission
   string, error shape and endpoint path in `docs/frontend-api-map.md` is
   modeled from the product spec, not a verified contract. This is the
   single biggest integration risk — expect field/enum mismatches on first
   real integration.
2. **Brand logo in place, but two gaps remain.** The real lockup
   (`src/assets/brand/giantpay-logo.jpg`) is wired up in `Logo`. Missing: a
   standalone icon-only export (favicon and the collapsed-sidebar slot still
   use a typographic "G" placeholder — extracting one from the lockup would
   mean cropping the source file), and ideally a transparent-background
   version (the current file's opaque light background is handled with a
   white backing plate on the dark sidebar rather than altering the asset).
   See `docs/design-system.md`.
3. **TypeScript pinned to 6.0.3, not the newly-released 7.x.** `typescript-eslint`
   (8.69.0, latest at build time) does not yet support the TS 7 native
   compiler — installing TS 7 breaks `pnpm lint` entirely. Revisit this pin
   once typescript-eslint ships TS 7 support.
4. **CSRF handling unconfirmed.** The client assumes cookie-based sessions
   are sufficient; if the real backend also requires a CSRF token, the typed
   client (`services/api/client.ts`) needs a header added.
5. **Accessibility: automated coverage only.** ESLint's `jsx-a11y` ruleset
   passes and components follow the patterns in `docs/design-system.md`, but
   no manual screen-reader pass or axe-core scan has been run — that's
   scoped as part of Phase 7 hardening, not done here.
6. **Bundle size not yet tuned.** Production build succeeds
   (`pnpm build`); the main vendor chunk is ~134KB gzipped and the dashboard
   chunk (recharts) ~107KB gzipped — acceptable for a first pass, not yet
   budget-audited against the LCP/INP targets in the spec.
7. **A `pnpm build` with the default `.env` produces a mock-enabled bundle**
   (by design — `.env` is the local/demo config; see `.env.example`). A real
   deployment must supply its own `.env.production` with
   `VITE_USE_MOCK_API=false`, `VITE_APP_ENV=production`, and a real
   `VITE_API_URL` — `src/app/config/env.ts` will refuse to start if those
   two are misconfigured together.

## Mocked dependencies (everything the app currently talks to)

MSW handlers under `src/mocks/handlers/`: auth, payments, payment links,
refunds, checkout, merchants (onboarding), dashboard. See
`docs/frontend-api-map.md` for the exact endpoint list and which service
modules are stubs pending Phase 4–6.

## Suggested next steps, roughly in priority order

1. Get the real backend OpenAPI spec (or hand-written contract) and
   reconcile `docs/frontend-api-map.md` + `types/*.ts` against it —
   generate types from the spec if available.
2. Build the developer platform (API keys, webhooks) — merchants can't
   self-serve integration without it, and it's the most-requested surface
   after core payments per the spec's phase ordering.
3. Build the admin console, starting with merchant application review
   (nothing can go to production without it) and refund approvals
   (maker-checker).
4. Settlements + reconciliation — needed before any real money moves.
5. Phase 7 hardening pass: axe-core scan, cross-browser check, Lighthouse
   budget, full 10-journey Playwright suite from the spec.
