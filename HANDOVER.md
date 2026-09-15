# GiantPay Frontend — Handover Notes

Status as of this delivery: **Foundation + Merchant core + Hosted checkout +
Settlements/Reconciliation** built and hardened, against a fully mocked
backend (MSW). No real GiantPay backend, OpenAPI spec, or backend contract
exists in the repository — see `docs/frontend-architecture.md` for the full
phased plan and what's built vs. stubbed, and `README.md` for how to run
and develop against this project day to day.

## What's actually working (verified, not assumed)

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (103 tests across 19 files) and
  `pnpm build` all pass cleanly with zero errors.
- The app was run in a real headless Chromium browser (not just built) and
  the following flows were exercised end-to-end against the mock backend,
  including a full write round-trip (not just reads): landing page → login
  → MFA (code `123456`) → dashboard → transactions list/filtering →
  transaction detail → payment link creation → hosted checkout (submit →
  trusted-status polling → success) → settlements list/detail →
  reconciliation overview → a reconciliation run with a real exception →
  opening the update dialog → submitting a note → confirming the new status
  and owner only appeared after a real backend round-trip (not an
  optimistic local change) — at both desktop (1280px) and mobile (375px)
  viewports, with zero console/network errors throughout.
- Playwright specs exist for the core payment journeys (`e2e/`) and are
  wired to run against a mocked, minified preview build (`.env.e2e`), not
  the dev server or real production config.

## Demo accounts (mock mode only — `mocks/fixtures/session.ts`)

| Email | Password | Role | Notes |
|---|---|---|---|
| chikondi.banda@kambazapay.mw | GiantPay!Demo1 | OWNER | MFA enabled, code `123456`; has `reconciliation:manage` — can update exceptions |
| grace.phiri@kambazapay.mw | GiantPay!Demo1 | VIEWER | No MFA, read-only permissions — use to verify permission enforcement |
| admin@giantpay.mw | GiantPay!Demo1 | PLATFORM_ADMIN | MFA enabled; admin routes are all stubs, so this account mainly demonstrates the admin shell/layout and permission gating |

These render as quick-fill buttons on `/login` whenever `VITE_USE_MOCK_API=true`.

## Completed

- Full app shell: 5 layouts (Public, Auth, Merchant, Admin, Checkout), design
  tokens, shared component library, typed API client + error normalization,
  route guards enforcing permissions (not just hiding nav), error
  boundaries, MSW mock layer with Malawi-realistic demo data.
- **Authentication & session**: login, MFA challenge (paste/resend/countdown),
  register, forgot/reset password, verify email, logout with full cache
  clear. Session bootstrap is StrictMode-safe and always reaches a terminal
  state (authenticated/unauthenticated/error) — never an indefinite
  "Checking your session," including on a genuine backend failure, which
  now gets its own retryable error state rather than being silently
  treated as "signed out."
- **Environment configuration**: all env access centralized in
  `src/app/config/env.ts`; fails loudly on a missing required variable;
  refuses to start if mock mode is combined with a production env. See
  `README.md`'s Environment variables section.
- Merchant onboarding: 5-step wizard (business info, ownership, KYC/KYB
  document upload with real progress, client-side type/size validation,
  classified error messages, cancel-on-remove and retry, settlement config,
  review + declaration), draft autosave, application-status view once
  submitted.
- Dashboard: summary stats, volume chart (with accessible text summary),
  reconciliation/settlement summaries, attention queue, recent transactions.
- Transactions: filterable/paginated list (URL-persisted filters),
  responsive table, detail page with full event timeline.
- Payment links: list, create (fixed/customer-entered, single-use/reusable),
  detail with disable action.
- Refunds: list, request dialog enforcing the backend-confirmed refundable
  ceiling, detail page.
- **Hosted checkout**: session load → channel/customer form → submit →
  trusted status polling → success/pending/failed/expired result screens.
  Standalone `/payment/:reference` status lookup page for return-URL flows.
  Polling is bounded (2.5s interval, 60s max), StrictMode-safe (each poll
  attempt owns its own `AbortController` — no duplicate loops), classifies
  permanent vs. transient failures (a 404/401/403 stops immediately; a
  network/5xx/malformed response retries within the window), and always
  reaches a visible terminal UI state — **never marks a payment successful
  from anything other than a fresh, validated backend status fetch.**
- **Settlements**: list (status, amount, masked destination, period) and
  detail (included transactions, explicit payment-vs-settlement-confirmation
  messaging) — derived from and cross-linked to real transaction data, not
  a disconnected fixture.
- **Reconciliation**: overview (matched/unmatched/exception summary + run
  list) and run detail (full exception queue: type, expected/observed/
  difference, owner, priority, status). Exception status updates
  (Investigate → Resolve/Escalate, note required on terminal transitions)
  go through a real PATCH round-trip with runtime-validated response —
  a click can never *appear* to resolve an exception the backend didn't
  confirm, and an invalid transition is rejected server-side (422), not
  just hidden client-side.
- **File uploads**: hardened against a malformed-JSON response hanging the
  upload promise forever, an independent (not just browser-native) timeout
  and abort guard, runtime-validated upload responses, and classified
  per-failure-type user messages. See `README.md`'s File uploads section.
- Settings: profile + security (password change UI, MFA status).

## Explicitly NOT built (routed, permission-gated, honest "coming soon" stub — not faked)

- Reports (merchant-side)
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
2. **Brand logo and assets resolved.** Real transparent PNG assets (`giantpay-logo.png` lockup and `giantpay-mark.png` standalone icon) are in place under `src/assets/brand/` and `public/`. The collapsed-sidebar slot and favicon use the real GP mark icon cleanly without backing plates, and the login experience features a modern translucent glassmorphism card on a centered navy gradient layout.
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
   (`pnpm build`); the main vendor chunk is ~133KB gzipped and the dashboard
   chunk (recharts) ~107KB gzipped — acceptable for a first pass, not yet
   budget-audited against the LCP/INP targets in the spec.
7. **A `pnpm build` with the default local env produces a mock-enabled
   bundle** (by design — `.env.local` is the local/demo config; see
   `.env.example`). A real deployment must supply its own production
   environment with `VITE_USE_MOCK_API=false`, `VITE_APP_ENV=production`,
   and a real `VITE_API_URL` — `src/app/config/env.ts` will refuse to start
   if those two are misconfigured together.
8. **Reconciliation's allowed status transitions and note requirements are
   modeled, not confirmed.** The maker-checker-shaped workflow (OPEN →
   INVESTIGATING → ACTION_REQUIRED/RESOLVED/ESCALATED, note required on
   RESOLVED/ESCALATED) is a reasonable design, not a verified backend
   contract — reconcile against the real reconciliation service's actual
   state machine before launch.
9. **This project's `vitest.config.ts` runs with `isolate: false`**
   (worker reuse across test files, for startup speed on constrained
   sandboxes). This shares the module registry across test files within a
   worker, which surfaced a real gap: mutable mock "backend" state (session,
   onboarding draft, reconciliation exceptions) needs an explicit reset
   between tests (see the `reset*MockState()` functions wired into
   `src/tests/setup.ts`) or it leaks across files. Keep this in mind when
   adding a new mock handler with in-memory state.

## Mocked dependencies (everything the app currently talks to)

MSW handlers under `src/mocks/handlers/`: auth, payments, payment links,
refunds, checkout, merchants (onboarding + document upload), dashboard,
settlements, reconciliation. See `docs/frontend-api-map.md` for the exact
endpoint list and which service modules are stubs pending a later phase.

## Suggested next steps, roughly in priority order

1. Get the real backend OpenAPI spec (or hand-written contract) and
   reconcile `docs/frontend-api-map.md` + `types/*.ts` against it —
   generate types from the spec if available. Pay particular attention to
   the reconciliation exception state machine (risk #8 above).
2. Build the developer platform (API keys, webhooks) — merchants can't
   self-serve integration without it.
3. Build the admin console, starting with merchant application review
   (nothing can go to production without it) and refund approvals
   (maker-checker).
4. Reports.
5. Phase 7 hardening pass: axe-core scan, cross-browser check, Lighthouse
   budget, full 10-journey Playwright suite from the spec.
