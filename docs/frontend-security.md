# GiantPay Frontend — Security & Privacy Rules

These rules are enforced by construction (architecture/lint), not just by
convention, wherever practical.

## Trust boundary

- **The backend is the sole source of truth for authentication, authorization
  and financial state.** The frontend never marks a payment, refund or
  settlement as successful based on redirect query parameters, provider
  callbacks, client-side timers, or optimistic UI. `features/checkout`'s
  `usePaymentStatus` hook only ever renders the status last **fetched from
  the backend**; a redirect back from a provider triggers a fetch, not a
  state transition.
- Route guards (`RequireAuth`, `RequirePermission`) are a UX convenience.
  Every mutation additionally treats a `403`/`401` response as an expected,
  handled case — never assumed unreachable because "the button was hidden".

## Sessions & secrets

- Session identity is a cookie (`credentials: 'include'` on every request);
  the frontend never reads, writes or inspects a session token. In mock
  mode, MSW simulates this via an in-memory session, never `localStorage`.
- API secrets (webhook signing secrets, API key secrets) are shown **once**,
  immediately after creation, behind an explicit "I have copied/stored this"
  acknowledgement, then never re-requested or re-rendered — the mock backend
  intentionally does not expose them again either, to keep the UI honest
  about what a real backend would do.
- Nothing sensitive is ever written to `localStorage`/`sessionStorage`:
  allowed there is UI-only state (sidebar collapsed, last-selected date
  range) via `lib/persist.ts`, which is allowlisted to specific, named,
  non-sensitive keys.
- `VITE_`-prefixed env vars are bundled into the client and are **public by
  definition** — `.env.example` contains no secret, and code review of any
  new `VITE_*` var should ask "am I comfortable with this being visible in
  the browser devtools?".

## Redirects

- `returnTo`/redirect URLs are validated as same-origin relative paths
  (`lib/safeRedirect.ts`) before use, to prevent open-redirect via login or
  checkout return flows.

## Rendering

- No `dangerouslySetInnerHTML` outside of one reviewed, narrowly-scoped
  Markdown renderer for developer-docs content (sanitized via a fixed
  allowlist), never for user- or customer-supplied text.
- Backend errors are normalized (`services/api/errors.ts`) into a typed
  shape before display; raw stack traces, SQL errors, or provider payloads
  are never rendered to end users. A `requestId`/reference is preserved for
  support hand-off when the backend supplies one.

## Idempotency & financial mutations

- Payment, payment-link, and refund creation calls attach a client-generated
  idempotency key (`crypto.randomUUID()`) via the typed service layer, so a
  retried request (network blip, double-click) cannot double-create a
  financial record. Financial mutations are never blindly retried by
  TanStack Query's default retry logic (`retry: false` on those mutations).
- Money is represented and transmitted as **integer minor units**
  (e.g. tambala for MWK where applicable / whole-unit minor per backend
  contract) — see `lib/money.ts`. No floating-point arithmetic is used to
  compute an authoritative amount; formatting for display is a pure,
  non-authoritative presentation step.

## What this pass could not verify against a real backend

Because no OpenAPI spec or backend contract exists in this repository yet,
the following are modeled from the spec/proposal and **must be reconciled
against the real backend before go-live** (also tracked in `HANDOVER.md`):
exact permission string names, exact status enum values and transitions,
exact error response shape, CSRF handling mechanism (if the backend uses a
double-submit token in addition to cookies), and rate-limit response
headers/guidance surfaced on MFA/login.
