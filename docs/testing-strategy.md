# GiantPay Frontend — Testing Strategy

## Layers

1. **Unit** (Vitest): pure functions — `lib/money.ts` (minor-unit formatting,
   no float arithmetic), status-mapping tables, Zod schemas
   (onboarding/payment-link/refund), `lib/safeRedirect.ts`.
2. **Component** (Vitest + React Testing Library): permission guards
   (`RequireAuth`, `RequirePermission` render correctly for
   authenticated/unauthenticated/unauthorized states), high-value shared
   components (`Button`, `StatusBadge`, `CurrencyInput`, `DataTable` filters,
   `ConfirmationDialog` focus trap/return-focus, `AmountDisplay`).
3. **Integration** (Vitest + RTL + MSW node server): login + MFA flow,
   payment-link creation, transaction list filtering/pagination, refund
   request against a mocked refundable-amount ceiling.
4. **E2E** (Playwright, against the MSW-mocked app in a dedicated preview
   build): a subset of the spec's 10 journeys, chosen for highest risk/value
   in this phase:
   1. Merchant signs in (with MFA) and views the dashboard.
   2. Merchant creates a payment link.
   3. A mocked hosted-checkout completes and the frontend verifies status
      via a trusted backend call (never trusts the redirect) before showing
      success.
   4. Merchant views the resulting transaction detail and event timeline.
   5. Merchant requests a refund; UI enforces the backend-confirmed
      refundable ceiling.
   6. A `VIEWER`-role user is blocked from refund-request and payment-link
      creation actions/routes (permission enforcement, not just hidden UI).

   Remaining journeys (maker-checker refund approval, reconciliation
   exception resolution, full onboarding→approval loop) require the
   admin/support surfaces from later phases and are listed as pending in
   `HANDOVER.md`.

## Roles exercised in tests

`OWNER`/`ADMIN` (full merchant access), `FINANCE` (refunds/settlements),
`DEVELOPER` (API keys/webhooks — stub in this phase), `VIEWER` (read-only,
used for negative permission tests).

## Non-negotiables

- No critical flow is asserted only via snapshot; assertions check rendered
  status, permission outcome, and the specific API call shape (e.g. refund
  mutation carries an idempotency key).
- Every "financial creation" test asserts the request is **not** retried
  automatically on failure.
- Accessibility: `@testing-library`'s role/name queries double as an
  accessibility check (a control that can't be found by role/name fails the
  test); critical screens additionally get an `axe-core` scan
  (`tests/a11y.ts` helper) as part of Phase 7 hardening.

## Commands

```
pnpm lint        # eslint
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run
pnpm test:watch  # vitest
pnpm e2e          # playwright test
pnpm build        # production build
```
