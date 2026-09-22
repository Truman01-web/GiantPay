# GiantPay page and route completeness matrix

Status is based on the sandbox contracts in this repository. "Live" means connected to a real GiantPay backend contract; it does not mean a production payment, payout, email, SMS, or provider integration is active. Detail routes inherit their parent navigation context.

## Public and authentication

| Required route | Existing page | Navigation | Permission | Backend dependency | Status | Tests | Remaining external dependency |
|---|---|---|---|---|---|---|---|
| `/` | LandingPage | Public logo/home | Public | None | Complete | Build/router audit | None |
| `/pricing` | PricingPage | Public Pricing | Public | None | Complete | Build/router audit | Commercial approval before live pricing |
| `/privacy` | PrivacyPage | Footer | Public | None | Complete | Build/router audit | Legal approval |
| `/terms` | TermsPage | Footer/register | Public | None | Complete | Build/router audit | Legal approval |
| `/status` | StatusPage | Public Developers/Resources | Public | Health API | Sandbox status | Build/API tests | Hosted monitoring for public production status |
| `/login` | LoginPage | Public CTA | Anonymous only | `/auth/login`, `/auth/session` | Live | LoginFlow, guards, backend auth | None |
| `/register` | RegisterPage | Public CTA | Anonymous only | `/auth/register`, registration OTP endpoints | Live when SMTP is configured; explicit unavailable state otherwise | RegisterForm, OTP integration, SMTP/config tests | SMTP credentials plus SPF, DKIM and DMARC |
| `/forgot-password` | ForgotPasswordPage | Login | Public | `/auth/password/forgot` | Enumeration-safe request state | Frontend/backend auth tests | Approved email delivery template/provider |
| `/reset-password` | ResetPasswordPage | Email deep link | Public | `/auth/password/reset` | Live contract | Frontend/backend auth tests | Email delivery for reset link |
| `/verify-email` | VerifyEmailPage | Email deep link | Public | `/auth/email/verify` | Legacy token flow retained | Frontend/backend auth tests | Email delivery for legacy flow |
| `/checkout/:token` | CheckoutPage | Payment-link deep link | Public | Checkout/payment APIs | Sandbox live | Checkout tests | Live payment providers |
| `/payment/:reference` | PaymentStatusPage | Checkout result | Public | Payment-status API | Sandbox live | Checkout/payment tests | Live payment providers |
| Company pages | Dedicated About, GiantPlus, Compliance, Contact and Careers pages | Public Company | Public | None | Complete | Build/router audit | Approved corporate content/contact handling |
| Product and service pages | PublicFeaturePage | Public Products/Services | Public | None | Honest sandbox capability pages | Build/router audit | Provider and regulatory onboarding for live claims |
| Developer overview | OverviewPage | Public Developers | Public | None | Complete | Build/router audit | None |
| API documentation | ApiDocumentationPage | Public Developers | Public | OpenAPI | Complete | OpenAPI validation/build | None |
| Collections API | CollectionsApiPage | Public Developers | Public | Sandbox collections APIs | Complete | OpenAPI/backend tests | Live collection providers |
| Disbursements API | DisbursementsApiPage | Public Developers | Public | No live payout mutation | Safe sandbox documentation | OpenAPI/build | Live payout provider approval |
| Webhooks documentation | WebhooksPage | Public Developers | Public | Webhook APIs | Complete | Developer-platform tests | Merchant HTTPS endpoint |
| SDKs | SdksPage | Public Developers | Public | None | Availability stated accurately | Build/router audit | Published SDK packages |
| Sandbox documentation | SandboxPage | Public Developers | Public | Sandbox APIs | Complete | Build/router audit | None |
| Unknown route | NotFoundPage | Back/home actions | Public | None | Professional 404 | Build/router audit | None |

## Merchant portal

| Required route | Existing page | Navigation | Permission | Backend dependency | Status | Tests | Remaining external dependency |
|---|---|---|---|---|---|---|---|
| `/dashboard` | DashboardPage | Overview | Authenticated merchant | Dashboard APIs | Live sandbox | Dashboard/auth/guard tests | Live providers for production totals |
| `/onboarding` | OnboardingPage | Overview | `onboarding:read` or `onboarding:write` | Onboarding APIs | Live sandbox workflow | Onboarding tests | Compliance review and document storage policy |
| `/transactions`, `/transactions/:id` | TransactionsPage, TransactionDetailPage | Payments | `payments:read` | Payment APIs | Live sandbox | Payment tests | Live payment providers |
| `/payment-links`, `/payment-links/create`, `/payment-links/:id` | Payment link pages | Payments | `payments.links:manage` | Payment-link APIs | Live sandbox | Payment-link/checkout tests | Live payment providers |
| `/refunds`, `/refunds/:id` | Refund pages | Payments | `payments.refunds:request` | Refund APIs | Live sandbox with maker-checker | Refund tests | Live provider refund execution |
| `/settlements`, `/settlements/:id` | Settlement pages | Money | `settlements:read` | Settlement APIs | Sandbox evidence only | Settlement tests | Bank/payout integration |
| `/reconciliation`, `/reconciliation/:id` | Reconciliation pages | Money | `reconciliation:read` | Reconciliation APIs | Live sandbox review | Reconciliation tests | Provider statement feeds |
| `/reports` | ReportsPage | Money | `reports:read` | Reporting APIs | Live sandbox exports | Reporting tests | None |
| `/developers`, `/developers/api-keys` | Developer dashboard/key pages | Build | Developer key permission | Developer APIs | Live sandbox | Developer tests | None |
| `/developers/webhooks`, `/developers/webhooks/:id` | Webhook pages | Build | `developer.webhooks:manage` | Webhook APIs | Live sandbox | Developer/webhook tests | Merchant HTTPS receiver |
| `/developers/documentation` | DeveloperDocumentationPage | Developer parent context | `developer.apiKeys:manage` | Public docs/OpenAPI | Complete | Navigation/build | None |
| `/team` | TeamPage | Organization | `team:read` | Team APIs | Live | Team tests | External invitation email delivery |
| `/roles` | RolesPage | Organization | `roles:read` | Role APIs | Live | Team/role tests | None |
| `/settings`, `/settings/security` | Settings pages | Organization | `security:manage:self` | Session/security APIs | Live | Security/guard tests | Authenticator application for TOTP setup |
| `/support`, `/support/:id` | Support pages | Organization | `support:read` | Support APIs | Live | Support tests | Staff operating process |

## Platform administration

| Required route | Existing page | Navigation | Permission | Backend dependency | Status | Tests | Remaining external dependency |
|---|---|---|---|---|---|---|---|
| `/admin` | AdminHomePage | Overview | `platform.health.read` or `platform.merchants.read` | `/platform/operations/overview` | Live | Operations/page tests | None |
| `/admin/merchant-applications`, `/:id` | AdminApplications pages | Merchants | `compliance:read` | Compliance APIs | Live | Onboarding/platform tests | Human compliance review |
| `/admin/merchants`, `/:id` | AdminMerchants pages | Merchants | `platform.merchants.read` | Platform merchant APIs | Live, redacted | Platform tests | None |
| `/admin/transactions`, `/:id` | AdminTransactions pages | Operations | `platform.transactions.read` | Platform transaction APIs | Live, redacted | Platform/page tests | Live providers for production activity |
| `/admin/refunds` | AdminRefundsPage | Operations | `platform.refunds.read` | `/platform/refunds` | Live sandbox | Platform/refund tests | Live provider refund execution |
| `/admin/refunds/pending` | AdminPendingRefundsPage | Operations | `platform.refunds.read` | Existing admin refund decision API | Live maker-checker queue | Refund/platform tests | None |
| `/admin/settlements` | AdminSettlementsPage | Operations | `platform.settlements.read` | `/platform/settlements` | Sandbox-only, no payout | Platform tests | Bank/payout integration |
| `/admin/reconciliation` | AdminReconciliationPage | Operations | `platform.reconciliation.read` | Platform exception API | Live exception worklist | Reconciliation/platform tests | Provider statement feeds |
| `/admin/exceptions`, `/:id` | AdminException pages | Operations | `platform.reconciliation.read` | Platform exception APIs | Live, redacted | Platform/page tests | Provider statement feeds |
| `/admin/providers` | AdminProvidersPage | Platform | `platform.operations.read` | Operations overview | Live configuration state; no fabricated activation | Operations/page tests | Provider credentials and approvals |
| `/admin/users` | AdminUsersPage | Platform | `team:read` | `/platform/users` | Live, auth secrets excluded | Platform/page tests | None |
| `/admin/roles` | AdminRolesPage | Platform | `roles:read` | `/platform/roles` | Live effective-role view | Platform/page tests | None |
| `/admin/audit-logs` | AdminAuditLogsPage | Platform | `platform.audit.read` | `/platform/audit-events` | Live, redacted and access-audited | Platform tests | None |
| `/admin/incidents` | AdminIncidentsPage | Platform | `platform.incidents.read` | Operations incident APIs | Live | Operations tests | Staff incident process |
| `/admin/security` | AdminSecurityPage | Platform | `platform.controls.read` | Operations controls | Live read state; mutations remain maker-checker | Operations tests | None |
| `/admin/reports` | AdminReportsPage | Platform | `platform.metrics.read` | Operations metrics | Live sandbox metrics | Operations/page tests | External observability export if required |
| `/admin/system-health` | AdminSystemHealthPage | Platform | `platform.health.read` | `/platform/health` | Live authenticated readiness | Health/page tests | None |
| `/admin/settings` | AdminSettingsPage | Platform | `platform.operations.read` | Operations controls | Live effective settings | Operations/page tests | Hosting/provider configuration remains out of app |

## Audit result

- Every required route resolves to a concrete page; no router uses `FeatureComingSoon`.
- Direct access is protected by the same permission shown in navigation, and unauthorized navigation entries are hidden.
- List/detail pages preserve parent context, expose retryable safe errors, and handle loading and empty results.
- Production-provider actions remain disabled unless separately approved and configured.
