# GiantPay Frontend — Routes & Access Control

## Route groups and layouts

| Group | Layout | Guard |
|---|---|---|
| Public | `PublicLayout` | none (checkout/payment status pages are public but token-scoped) |
| Auth | `AuthLayout` | redirects away if already authenticated |
| Merchant | `MerchantLayout` | `RequireAuth` + merchant-context permission checks |
| Admin | `AdminLayout` | `RequireAuth` + `PLATFORM_ADMIN`/internal-role checks |
| Checkout | `CheckoutLayout` | token-scoped, isolated bundle, no merchant/admin nav or code |

## Role model

`OWNER`, `ADMIN`, `FINANCE`, `OPERATIONS`, `DEVELOPER`, `SUPPORT`,
`COMPLIANCE`, `VIEWER` (merchant-side), `PLATFORM_ADMIN` (GiantPay internal).

The frontend reads an explicit **permission list** returned by the backend
session (`session.permissions: string[]`) rather than inferring capability
from role name — role is used only for display and for defaulting an invite
form, never for authorization decisions. Until the real backend contract
exists, `mocks/fixtures/permissions.ts` defines the permission strings this
frontend expects (e.g. `payments:read`, `payments.refunds:request`,
`payments.refunds:approve`, `developer.apiKeys:manage`,
`admin.merchants:review`) — **this list must be reconciled against the real
backend contract before production launch** (tracked in `HANDOVER.md`).

## Guard behavior

- `RequireAuth`: no session → redirect to `/login?returnTo=<path>`, sanitized
  (same-origin, relative-only) to prevent open-redirect.
- `RequirePermission(permission)`: session present but missing permission →
  render `<ForbiddenPage />` (a real 403 page) at that route; **never** a
  silent redirect to `/dashboard`, which would look like the page doesn't
  exist and leak information asymmetrically compared to a real 404.
- Navigation items are filtered by the same permission list so a user never
  sees a link they cannot use — but every guarded route also re-checks on
  direct URL entry (deep links are protected, not just parent pages).
- Hidden UI is **never** treated as authorization; the backend remains
  authoritative and every mutation handler treats a 403 response as
  expected, not exceptional.

## Route table (this phase's implementation status)

Legend: **Full** = built to spec depth with loading/empty/error/permission
states. **Stub** = route exists, is permission-gated, renders a clear
"coming in a later phase" placeholder (never fake data). **Planned** = not
yet routed.

### Public
| Route | Status |
|---|---|
| `/` | Full |
| `/login` | Full |
| `/register` | Full |
| `/forgot-password` | Full |
| `/reset-password` | Full |
| `/verify-email` | Full |
| `/checkout/:token` | Full |
| `/payment/:reference` | Full |
| `/privacy` | Full |
| `/terms` | Full |
| `/status` | Stub |

### Merchant
| Route | Status |
|---|---|
| `/dashboard` | Full |
| `/onboarding` | Full |
| `/transactions`, `/transactions/:id` | Full |
| `/payment-links`, `/payment-links/create`, `/payment-links/:id` | Full |
| `/refunds`, `/refunds/:id` | Full |
| `/settlements`, `/settlements/:id` | Stub |
| `/reconciliation`, `/reconciliation/:id` | Stub |
| `/reports` | Stub |
| `/developers/*` | Stub |
| `/team`, `/roles` | Stub |
| `/settings`, `/settings/security` | Full (security: password + MFA enroll only) |
| `/support`, `/support/:id` | Stub |

### Admin
| Route | Status |
|---|---|
| `/admin` | Stub (landing + health summary shell) |
| `/admin/merchant-applications`, `/:id` | Stub |
| all other `/admin/*` | Stub |

Every stub is reachable only by the correct permission and renders via the
same route file it will be filled into later — routing/guards are not
placeholders, only the page content is.
