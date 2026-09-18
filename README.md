# GiantPay

Frontend for **GiantPay**, GiantPlus's unified digital payment gateway for
businesses, institutions, digital platforms and customers in Malawi. This
repository contains the merchant-facing web application: registration and
KYC/KYB onboarding, a hosted checkout for customers, and a merchant
dashboard for managing payments, payment links, refunds, settlements and
reconciliation.

The repository includes the GiantPay sandbox backend under `server/`.
The frontend uses that API when mock mode is disabled; MSW remains available
only for tests and explicitly enabled local development.
See [Backend dependencies](#backend-dependencies) for exactly what that
means feature by feature, and `HANDOVER.md` for the full status/risk log.

## Contents

- [What's implemented](#whats-implemented)
- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Authentication](#authentication)
- [Checkout](#checkout)
- [API integration](#api-integration)
- [Runtime API validation](#runtime-api-validation)
- [File uploads](#file-uploads)
- [Mock mode](#mock-mode)
- [Routing](#routing)
- [Testing](#testing)
- [Quality checks](#quality-checks)
- [Production build](#production-build)
- [Deployment](#deployment)
- [Security practices](#security-practices)
- [Troubleshooting](#troubleshooting)
- [Backend dependencies](#backend-dependencies)
- [Contributing](#contributing)
- [Further documentation](#further-documentation)

## What's implemented

| Area | Status |
| --- | --- |
| Landing page, login, registration, forgot/reset password, email verification | Built |
| Merchant onboarding (business info, ownership, KYC/KYB document upload, settlement config, review) | Built |
| Hosted checkout and payment-status lookup | Built |
| Merchant dashboard (stats, volume chart, attention queue, recent transactions) | Built |
| Transactions (list, filters, pagination, detail + event timeline) | Built |
| Payment links (list, create, detail, disable) | Built |
| Refunds (list, request, detail) | Built |
| Settlements (list, detail) | Built |
| Reconciliation (runs, exception queue, status/note update workflow) | Built |
| Settings (profile, security/MFA) | Built |
| Reports, Developer platform (API keys/webhooks/docs), Team & roles, Support, Admin console | Routed and permission-gated, **not yet built** — shown as an honest "on the roadmap" state, never faked |

"Built" means real API integration through the typed service layer described
below (currently served by the mock backend — see [Mock
mode](#mock-mode)), with loading, empty, error and permission-denied states
handled. See [Backend dependencies](#backend-dependencies) for what each
area still needs from a real backend, and `HANDOVER.md` for the detailed,
dated status log.

## Technology stack

Only what's actually a dependency in `package.json`:

| Concern | Technology |
| --- | --- |
| UI framework | React 19 |
| Language | TypeScript (strict mode) |
| Build tool / dev server | Vite 8 |
| Styling | Tailwind CSS 4 (CSS-first config, design tokens as CSS custom properties) |
| Routing | React Router 7 |
| Server state | TanStack Query 5 |
| Forms | React Hook Form |
| Schema validation | Zod |
| Accessible UI primitives | Radix UI |
| Icons | Lucide React |
| Charts | Recharts |
| Dates | date-fns |
| Client-only global state | Zustand (session store only — most state is server state via TanStack Query) |
| HTTP | Native `fetch`, wrapped in one typed client (`src/services/api/client.ts`) — **no Axios** |
| API mocking | MSW (Mock Service Worker) |
| Unit/integration tests | Vitest + React Testing Library |
| E2E tests | Playwright |
| Linting | ESLint (flat config) + `typescript-eslint` |
| Formatting | Prettier |
| Package manager | pnpm (see `pnpm-lock.yaml` — don't mix in npm/yarn installs) |

## Requirements

- **Node.js 20+** (`"engines": { "node": ">=20" }` in `package.json`)
- **pnpm** (the project is pnpm-only)
- A modern evergreen browser for development (Chrome, Firefox, Edge, Safari)

## Getting started

```bash
git clone https://github.com/Truman01-web/GiantPay.git
cd GiantPay
pnpm install
cp .env.example .env.local
pnpm dev
```

Open the URL Vite prints (default `http://localhost:5173`).

No environment variables need to be exported manually in your shell — Vite
loads `.env.local` (and `.env`, `.env.[mode]`, `.env.[mode].local`) from the
project root automatically. `.env.local` is git-ignored, so each developer
keeps their own copy; `.env.example` is the checked-in template documenting
what's required.

The defaults in `.env.example` run the app entirely against the built-in
mock backend (MSW) — no real GiantPay API needs to be running to develop
against sandbox-realistic data. Demo sign-in accounts are listed in
`HANDOVER.md` and shown as quick-fill buttons on the login page. See [Mock
mode](#mock-mode).

## Environment variables

All frontend environment variables are read in exactly one place,
[`src/app/config/env.ts`](src/app/config/env.ts) — application code never
reaches for `import.meta.env` directly. It throws a clear startup error for
a missing required variable instead of letting `undefined` silently flow
into an API call, and it refuses to start if `VITE_USE_MOCK_API=true` is
combined with `VITE_APP_ENV=production`.

| Variable | Purpose | Required | Example |
| --- | --- | --- | --- |
| `VITE_API_URL` | Base URL of the GiantPay backend API (no trailing slash) | Yes | `http://localhost:4000` |
| `VITE_APP_NAME` | Display name shown in the UI/browser title | No (defaults to `GiantPay`) | `GiantPay` |
| `VITE_APP_ENV` | Logical environment name (`development`, `e2e`, `staging`, `production`, ...) — distinct from Vite's own build mode; see `env.ts` | No (defaults to `development`) | `development` |
| `VITE_USE_MOCK_API` | When `true`, the app runs entirely against MSW mock handlers (`src/mocks`) instead of a real backend | No (defaults to `false`) | `true` |
| `VITE_SENTRY_DSN` | Optional error-monitoring DSN. Leave unset unless error monitoring has been explicitly approved | No | *(empty)* |

### VITE_ variables are public — never put secrets in them

Any variable prefixed `VITE_` is inlined into the client bundle at build
time and is **readable by anyone using the app's browser devtools**. This
is a hard Vite rule, not a bug or an oversight. Every variable in the table
above is safe to expose by design.

**Never** create a `VITE_`-prefixed variable for any of the following —
each one belongs entirely to the backend:

- API secret keys or provider credentials
- Private keys
- Database passwords or connection strings
- Payment-provider secrets
- Webhook signing secrets
- JWT/session signing secrets

If a feature seems to need a secret on the frontend, the correct fix is a
backend endpoint that performs the privileged operation server-side — not
a new environment variable. Secrets (webhook signing secrets, API key
secrets) are shown to the user **once**, immediately after creation, exactly
as the backend returns them — the frontend never stores, logs or re-derives
one. See [Security practices](#security-practices) and
`docs/frontend-security.md`.

## Available scripts

All verified against `package.json` — every command below actually exists.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the Vite dev server (runs `predev` first, which regenerates the MSW worker script). |
| `pnpm build` | Type-checks (`tsc -b`) then produces a production build with Vite. |
| `pnpm preview` | Serves the built `dist/` output locally, for a final check of the production bundle. |
| `pnpm lint` | Runs ESLint across the project. |
| `pnpm typecheck` | Runs the TypeScript compiler in `--noEmit` mode. |
| `pnpm test` | Runs the unit/integration test suite once (Vitest). |
| `pnpm test:watch` | Runs the test suite in watch mode. |
| `pnpm test:coverage` | Runs the test suite with coverage reporting. |
| `pnpm e2e` | Runs the Playwright end-to-end suite (see [Testing](#testing)). |
| `pnpm msw:init` | Regenerates `public/mockServiceWorker.js`. Runs automatically before `pnpm dev`; only needed manually otherwise. |

## Project structure

```text
src/
├── app/               # Composition root: config, providers, router, design tokens
│   ├── config/           # env.ts — the only place import.meta.env is read
│   ├── providers/         # SessionProvider, ErrorBoundary, QueryClient setup
│   ├── router/            # Route table, lazy page imports, route guards
│   └── theme/             # Design tokens (CSS custom properties)
├── assets/            # Static assets (brand logo, etc.)
├── components/         # Shared, feature-agnostic UI
│   ├── ui/               # Buttons, inputs, dialogs, radio/select — design-system primitives
│   ├── data-display/      # DataTable, StatusBadge, AmountDisplay, StatCard, Pagination
│   ├── feedback/          # Alert, Toast, EmptyState, ErrorState, Skeleton, FeatureComingSoon
│   ├── forms/             # FormField, FileUpload, PhoneInput, CurrencyInput
│   └── navigation/         # PageHeader, Breadcrumbs, Logo
├── features/           # One directory per product area — components + hooks + schemas
│   ├── authentication/, onboarding/, checkout/, dashboard/, payments/,
│   │   payment-links/, refunds/, settlements/, reconciliation/
│   └── (administration/, developers/, reports/, support/, team/, webhooks/ — reserved, not yet built)
├── hooks/              # Cross-cutting hooks (e.g. useSession)
├── layouts/            # PublicLayout, AuthLayout, MerchantLayout, AdminLayout, CheckoutLayout
├── lib/                # Framework-agnostic utilities (money formatting, safeRedirect, cn)
├── mocks/              # MSW mock backend
│   ├── handlers/          # One file per API domain
│   └── fixtures/          # Deterministic seed data (Malawi-realistic, MWK)
├── pages/              # Thin route-level wrappers around feature components (lazy-loaded)
├── services/api/        # Typed API client + one service module per API domain
├── tests/              # Global Vitest setup (MSW server lifecycle, jsdom polyfills)
└── types/              # Shared domain types (payments, auth, settlements, reconciliation, ...)
```

Every fully-built feature follows the same shape: a `services/api/<domain>.ts`
module (typed requests + response validation where it matters), a
`features/<domain>/use<Domain>Queries.ts` hook file (TanStack Query), one or
more feature components, and a thin `pages/<Domain>Page.tsx` that the router
lazy-imports. Routed-but-unbuilt areas render `FeatureComingSoon` instead of
calling into anything.

## Architecture

```text
Pages (lazy-loaded route components)
   ↓
Feature components (features/<domain>)
   ↓
TanStack Query hooks (use<Domain>Queries.ts) — server state, caching, invalidation
   ↓
Typed API services (services/api/<domain>.ts) — one function per endpoint,
   runtime-validate the response where a wrong shape would matter (see
   Runtime API validation)
   ↓
API client (services/api/client.ts) — fetch wrapper: base URL, credentials,
   AbortSignal support, error normalization into a typed ApiError, a
   separate XHR-based path for uploads (progress events + a timeout guard)
   ↓
GiantPay backend API  — currently served by an MSW mock in the browser
   (src/mocks) when VITE_USE_MOCK_API=true
```

Supporting pieces that cut across this stack:

- **Authentication**: `SessionProvider` (`src/app/providers`) bootstraps the
  session once at startup and holds it in a small Zustand store
  (`services/auth/sessionStore.ts`); route guards in `app/router/guards.tsx`
  read from that store. See [Authentication](#authentication).
- **Routing**: React Router 7, with route-group layouts and permission
  guards. See [Routing](#routing).
- **State management**: server data lives in TanStack Query; the only
  client-only global state is the session store. Everything else is local
  component state or URL search params (filters, pagination).
- **Design tokens**: colors, spacing, radii and typography are CSS custom
  properties in `app/theme`, consumed via Tailwind — see
  `docs/design-system.md`.

## Authentication

At a high level:

1. On app start, `SessionProvider` calls the session-check endpoint once.
   While that's in flight, protected routes show a loading state — never
   an indefinite spinner (this was a specific StrictMode-safety fix; the
   effect is idempotent and always reaches a terminal outcome).
2. **Authenticated**: the session (user, permissions, environment) is held
   in the session store; protected routes render normally.
3. **Unauthenticated** (no session, or the session check fails): protected
   routes redirect to `/login`, preserving a safe (same-origin,
   relative-only) return path.
4. **Session-check failure** (network/server error, distinct from "not
   logged in"): a retryable error state is shown instead of silently
   treating the visitor as signed out or hanging forever.
5. **Logout** clears the session store and the entire TanStack Query
   cache — nothing sensitive survives a sign-out in memory.
6. **Expired session**: any API response with an unauthorized status
   triggers the same global "session lost" handling, redirecting to login.

The frontend holds no session token itself — the session is a
backend-managed cookie (`credentials: 'include'` on every request); there
is nothing for the frontend to read, write, or store client-side.
**Authorization is enforced by the backend.** The frontend's permission
guards (`RequireAuth`, `RequirePermission`) are a UX convenience that hides
navigation and blocks obviously-unauthorized screens — every mutation still
treats a `401`/`403` response from the backend as an expected, handled
case, never as something that "can't happen because the button was
hidden."

## Checkout

```text
Checkout page loads a session for the payment token
   ↓
Customer submits payment details
   ↓
Backend returns a payment reference
   ↓
Frontend polls the trusted payment-status endpoint
   (every 2.5s, bounded to a 60s window — see usePaymentStatusPolling.ts)
   ↓
Terminal status reached, OR the window elapses
   ↓
Success / Failed / Expired / "couldn't confirm, try again" shown
```

**The frontend never marks a payment successful because the customer was
redirected back, a URL parameter says so, or the payment window closed.**
The only way this app learns a payment outcome is by asking the backend's
trusted status endpoint and rendering exactly what it returns.

Polling behavior, as actually implemented:

- Interval: 2.5 seconds between attempts.
- Maximum duration: 60 seconds of retrying before giving up.
- A permanent error from the backend (404 unknown reference, 401/403) stops
  polling immediately rather than retrying for the full window.
- A transient error (network failure, 5xx, an unparsable response body) is
  retried on the normal interval until the window elapses, then surfaces a
  clear, safe "couldn't confirm, please check again" state with a manual
  retry action — never an indefinite spinner.
- Every effect run owns its own `AbortController`, so React StrictMode's
  dev-mode double-invocation can't produce two concurrent polling loops,
  and navigating away or unmounting always cancels the in-flight request.

## API integration

- **Client**: [`src/services/api/client.ts`](src/services/api/client.ts) —
  the only place that calls `fetch` (plus one XHR-based `uploadFile` used
  specifically for progress-reporting file uploads). Every other module
  goes through this.
- **Base URL**: `${env.apiUrl}/v1${path}`, where `env.apiUrl` comes from
  `VITE_API_URL` via the central config module.
- **Auth**: `credentials: 'include'` on every request — session identity is
  a cookie, never a token the frontend handles.
- **Errors**: any non-2xx response, network failure, or timeout is
  normalized into a typed `ApiError` (`{ code, message, fields?,
  requestId?, status }`) with getters like `.isUnauthorized`,
  `.isNotFound`, `.isPayloadTooLarge` — features branch on these, never on
  a raw `Response`/exception. Messages shown to users come from this typed
  shape, never a raw stack trace or provider payload.
- **Idempotency**: financial-creation calls (refunds, payment links) attach
  a client-generated `Idempotency-Key` header.
- **Service modules**: one file per API domain in `services/api/`, each
  exporting plain typed functions (see [Project structure](#project-structure)
  and `docs/frontend-api-map.md` for the exact current endpoint list).

## Runtime API validation

TypeScript guarantees the *shape you asked for* at compile time — it says
nothing about what a real HTTP response actually contains. This project
validates a response at runtime, before trusting it, specifically where a
wrong or malformed shape would otherwise be silently treated as success.
Implemented today:

- **Checkout payment status** (`usePaymentStatusPolling.ts`) — a response
  missing `reference`/`status`/`amount` is rejected and treated as a
  retryable error, never as a valid (let alone successful) status.
- **File-upload responses** (`services/api/merchants.ts`) — an upload
  response missing `id`/`fileName`/`sizeBytes` throws a classified error
  instead of being returned as a successful upload.
- **Reconciliation exception updates** (`services/api/reconciliation.ts`) —
  a status-update response is validated before the UI reflects the new
  status, so a click can never *appear* to resolve an exception the
  backend didn't actually confirm.

Where a malformed response is detected: the operation is **not** treated as
successful, the loading state still terminates, a safe user-facing message
is shown, and a diagnostic (never the raw response body, which could echo
back sensitive fields) is logged via `console.error` — see
`docs/frontend-security.md` for the logging convention. Other list/detail
endpoints rely on TypeScript's compile-time shape plus the same top-level
`ApiError` handling; they haven't needed the extra runtime guard because a
malformed list item degrades to an odd-looking row, not a false "success."

## File uploads

The only upload surface today is merchant KYC/KYB document upload during
onboarding (`features/onboarding/steps/DocumentsStep.tsx` +
`components/forms/FileUpload.tsx`).

- **Accepted types**: PDF, JPG, JPEG, PNG (checked against the file's
  actual `file.type`, not just its extension — drag-and-drop bypasses the
  native picker's `accept` filter, so extension-only checking isn't
  sufficient).
- **Size limit**: 10MB per file.
- **Both are enforced client-side before any request is made** — a
  rejected file shows an inline message and never reaches the network.
  This is a UX improvement, not a security boundary: **the backend
  independently validates every uploaded file** regardless of what the
  frontend already checked.
- **Transport**: `FormData` with the file under the `file` field and the
  document category under `category` — sent via XHR (not `fetch`, so real
  upload-progress events are available), never JSON-serialized.
- **Response validation**: see [Runtime API validation](#runtime-api-validation)
  above.
- **Timeout**: a 60-second upload timeout, enforced by an explicit
  application-level timer (not just the browser's native `XMLHttpRequest`
  timeout, which isn't implemented by every environment/mocking layer) —
  the promise, and the caller's loading state, can never hang indefinitely.
- **Cancellation**: each in-flight upload has its own `AbortController`;
  removing a document or navigating away cancels the request and never
  shows a stray failure for something the user already dismissed.
- **Retry**: a failed upload can be retried once per click — a duplicate
  click while a retry is already in flight is guarded against, and the
  retry re-uses the original file (kept in a ref alongside the visible
  state, since a `File` object isn't serializable state).
- **Error messages**: classified into safe, specific copy (too large,
  unsupported type, session expired, permission denied, rate-limited,
  network, timeout, "couldn't be confirmed") — never a raw XHR/Axios-style
  error.

## Mock mode

With `VITE_USE_MOCK_API=true` (the `.env.example` default), `src/main.tsx`
starts an MSW service worker before rendering the app, and every request
from the typed API client is served by the handlers in `src/mocks/handlers`
from deterministic, Malawi-realistic fixture data (`src/mocks/fixtures`) —
no network call ever leaves the browser. Demo sign-in accounts are listed
in `HANDOVER.md` and shown as quick-fill buttons on `/login`.

Set `VITE_USE_MOCK_API=false` and point `VITE_API_URL` at a running backend
to develop against the real API instead. `src/app/config/env.ts` actively
**refuses to start** if mocking is left on while `VITE_APP_ENV=production`,
so a mocked build can't silently ship as the production bundle — this is a
hard startup failure, not a warning.

Mock data is exclusively for development and testing. It's never read by
any code path that also runs in production — the mock worker is only ever
started behind the `VITE_USE_MOCK_API` check above.

## Routing

| Group | Layout | Example routes | Access |
| --- | --- | --- | --- |
| Public | `PublicLayout` | `/`, `/privacy`, `/terms`, `/status` | None |
| Auth | `AuthLayout` | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Redirects away if already authenticated |
| Checkout | `CheckoutLayout` | `/checkout/:token`, `/payment/:reference` | Token-scoped, isolated bundle — no merchant/admin code loaded |
| Merchant | `MerchantLayout` | `/dashboard`, `/transactions`, `/payment-links`, `/refunds`, `/settlements`, `/reconciliation`, `/reports`, `/developers`, `/team`, `/settings`, `/support` | `RequireAuth` + per-route `RequirePermission` |
| Admin | `AdminLayout` | `/admin`, `/admin/merchants`, `/admin/refunds`, `/admin/audit-logs`, ... | `RequireAuth` + admin permissions |

Every merchant/admin route is wrapped in `RequirePermission`, checking an
explicit permission list from the session (never inferred from role name).
A user without the right permission sees a real permission-denied page at
that URL — not a silent redirect that would look like the page doesn't
exist. Deep links are protected the same way as nav-reachable pages: hiding
a sidebar item is never treated as the security boundary. See
`docs/frontend-routes.md` for the complete, current route table.

## Testing

- **Unit/integration**: Vitest + React Testing Library, configured in
  `vitest.config.ts` with global setup in `src/tests/setup.ts` (starts/stops
  an MSW node server for every test, resets mock "backend" state between
  tests, and polyfills `matchMedia`/`ResizeObserver` for jsdom).
- **E2E**: Playwright (`playwright.config.ts`), run against a real
  minified preview build under a dedicated `e2e` env file (`.env.e2e`),
  not the dev server or a production config.

```bash
pnpm test            # run the full unit/integration suite once
pnpm test:watch      # watch mode
pnpm test:coverage   # with coverage
pnpm e2e             # Playwright end-to-end suite
```

Test files sit next to the code they test (`*.test.ts(x)`). See
`docs/testing-strategy.md` for what's covered at each layer and the
project's testing conventions (e.g. no critical flow asserted only via
snapshot).

## Quality checks

Run all of these before opening a PR or cutting a release — none should
report an error:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Production build

```bash
pnpm build
```

Type-checks the whole project (`tsc -b`), then produces a production
bundle with Vite into **`dist/`** at the repository root (Vite's default —
no custom `build.outDir` is configured). To sanity-check the built output
locally before deploying:

```bash
pnpm preview
```

This serves `dist/` on a local port so you can verify the production
bundle behaves correctly, separate from the dev server.

## Deployment

This is a static single-page app — `dist/` is deployable to any static
host or CDN (a Node server is only needed for local preview). The exact
hosting target isn't fixed in this repository (no Dockerfile, Vercel/Netlify
config, or `.htaccess` is checked in), so treat the following as the
general procedure and adapt the specifics to your actual host:

1. **Set production environment variables** before building — through your
   CI/CD platform's environment configuration, or a `.env.production` file
   created at deploy time and **never committed**. At minimum:
   `VITE_API_URL` (the real backend), `VITE_APP_ENV=production`,
   `VITE_USE_MOCK_API=false`. The app refuses to start if the last two are
   misconfigured together (see [Mock mode](#mock-mode)).
2. **Build**: `pnpm build`.
3. **Locate the output**: the contents of `dist/` are what you deploy —
   upload/sync them to your host's document root (or the appropriate
   static-assets location for your platform).
4. **Configure SPA fallback routing** — see below; React Router needs this
   on any host that doesn't already know to serve `index.html` for unknown
   paths.
5. **Verify API connectivity** after deploying: open the deployed site,
   check the Network tab for requests to `VITE_API_URL`, and confirm no
   `VITE_USE_MOCK_API`-related startup error appears in the console.

### SPA routing fallback

React Router handles navigation client-side. A request straight to a
non-root path (e.g. a user refreshing on `/transactions/pay_123`, or
sharing that URL) must still be served `index.html` by the host, or it will
404 at the server level before React Router ever gets a chance to render
anything. Most static hosts (Netlify, Vercel, Cloudflare Pages, S3+CloudFront
with a custom error response, etc.) have a built-in "SPA fallback" or
rewrite-rule setting for exactly this — consult your host's docs for the
specific option name.

**If you are deploying to an Apache-based host (for example cPanel)**,
where this repository doesn't already provide the rewrite config, a
minimal `.htaccess` placed in the same directory as the deployed `dist/`
contents looks like:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

Adjust `RewriteBase` if the app is deployed under a subdirectory rather
than the domain root — and if so, also set Vite's `base` option in
`vite.config.ts` (not currently set, so it defaults to `/`) to match,
otherwise built asset URLs will be wrong. Only add this file if your host
is actually Apache-based; it does nothing (and isn't needed) on Nginx,
Vercel, Netlify, or similar platforms, which have their own rewrite
mechanisms.

## Security practices

- **No secrets in `VITE_` variables** — see the dedicated warning under
  [Environment variables](#environment-variables).
- **No credentials in source code** — nothing in this repository requires
  a real credential to run; `.env.example` contains only safe defaults.
- **No sensitive information in logs** — diagnostic `console.error` calls
  never include file contents, full API response bodies, or session
  details; see `docs/frontend-security.md`.
- **Backend-authoritative authorization** — see
  [Authentication](#authentication).
- **Backend-authoritative payment/financial state** — see
  [Checkout](#checkout); the same principle applies to refund and
  reconciliation-exception status.
- **Runtime API validation** on high-stakes responses — see
  [Runtime API validation](#runtime-api-validation).
- **Secure session handling** — cookie-based, `credentials: 'include'`;
  nothing sensitive is ever written to `localStorage`/`sessionStorage`.
- **Dependency hygiene** — keep dependencies current; run `pnpm audit`
  periodically (not currently wired into CI in this repository).
- **HTTPS in production** — the app assumes it is served over HTTPS in
  production (cookie-based sessions depend on it); this is a deployment/
  infrastructure responsibility, not something the frontend enforces.
- **Careful handling of uploaded files** — see [File uploads](#file-uploads);
  client-side validation is a UX convenience only, the backend independently
  validates every file.

This project does not claim any compliance certification (PCI-DSS, SOC 2,
etc.) — none has been obtained, and the frontend does not handle raw
payment-card data.

## Troubleshooting

**Application stuck on "Checking your session"**
Confirm `VITE_API_URL` is reachable and, in mock mode, that
`VITE_USE_MOCK_API=true` is actually set (a stale `.env.local` is the usual
cause). Session bootstrap (`SessionProvider`) is designed to always reach a
terminal state (authenticated/unauthenticated/error) — if it doesn't,
check the Network tab for what `GET /auth/session` is actually returning.

**API connection failures**
Verify `VITE_API_URL` in your active `.env.local` (Vite only re-reads env
files on restart — see below), confirm the backend (or, in mock mode, the
MSW worker) is actually responding in the Network tab, and check the
console for the startup error `env.ts` throws on a missing/misconfigured
variable.

**Checkout stuck on "Confirming your payment"**
This is expected while polling is still within its 60-second window (see
[Checkout](#checkout)) — the app is deliberately not showing success until
the backend confirms it. If it's stuck *after* that window, the UI should
have already switched to a "couldn't confirm, check again" state with a
retry button; if it hasn't, that's a bug, not expected polling behavior.

**Build failures**
Run these in order to isolate the problem:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

**Routing works locally but not after deployment**
Almost always a missing SPA fallback rewrite on the host — see [SPA routing
fallback](#spa-routing-fallback).

**Environment variable changes aren't taking effect**
Vite reads `.env*` files at server/build start, not on every request.
Restart `pnpm dev` after editing `.env.local`, and rebuild
(`pnpm build`) after changing production environment variables — a
running dev server or an already-built `dist/` won't pick up the change on
its own.

## Backend dependencies

### Available and integrated (frontend calls a working endpoint — currently the mock backend)

Authentication (login, MFA, password reset, email verification, session),
merchant onboarding (draft save/submit, document upload), dashboard summary
and volume, transactions (list, detail, events), payment links, refunds,
checkout session/submit/trusted status, settlements, reconciliation
(including the exception update workflow). See `docs/frontend-api-map.md`
for the exact endpoint list.

### Frontend implemented, backend dependency pending

None currently — every built feature already has a matching typed service
call. The dependency for all of the above is a **real backend implementing
the same contract** the mock currently serves; every status enum,
permission string and error shape is modeled from the product spec, not a
verified backend contract, and must be reconciled before production (see
`HANDOVER.md`, item 1).

### Development/mock only

Reports, Developer platform (API keys, webhooks, documentation), Team &
roles, Support, and the entire Admin console have no service call at all
yet — their routes render an honest "not yet built" state
(`FeatureComingSoon`). `src/services/api/stubs.ts` documents the intended
response shape for each so they can be built without an API-layer redesign.

## Contributing

- Create a branch per change; keep changes focused on one thing.
- Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` before
  opening a PR — all four should pass.
- Never commit `.env`, `.env.local`, or any file containing a real
  credential. `.env.example` is the exception — it's intentionally
  version-controlled and must stay free of real secrets (see
  [Environment variables](#environment-variables)).
- Update the relevant doc (this README, `docs/*.md`, or `HANDOVER.md`) in
  the same change when you alter behavior it describes — stale
  documentation is worse than none.

## Further documentation

- [`HANDOVER.md`](HANDOVER.md) — detailed, dated status: what's verified
  working, known risks, and suggested next steps.
- [`docs/frontend-architecture.md`](docs/frontend-architecture.md) — full
  architecture and phased delivery plan.
- [`docs/frontend-routes.md`](docs/frontend-routes.md) — complete route
  table and access-control model.
- [`docs/frontend-api-map.md`](docs/frontend-api-map.md) — exact endpoint
  list per service module.
- [`docs/design-system.md`](docs/design-system.md) — design tokens and
  component conventions.
- [`docs/frontend-security.md`](docs/frontend-security.md) — the security
  rules this codebase enforces by construction.
- [`docs/testing-strategy.md`](docs/testing-strategy.md) — what's tested at
  each layer and why.
