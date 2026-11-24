# GiantPay local website and supporting features — 19 November 2026

Work was performed in `C:\Users\GMT\Downloads\GiantPay-backend\.publish-giantpay`, the preserved checkout of `https://github.com/Truman01-web/GiantPay.git`. Initial branch: `feature/uncertain-payment-recovery`; initial HEAD: `404acf4`. The checkout was clean. The outer workspace has a broken Git worktree pointer; it was not repaired or changed. No AGENTS.md was found at the checkout, outer workspace or checked ancestor directories.

The initial implementation remained local. The user subsequently authorized a GitHub push after verification; this authorizes the necessary commit and feature-branch push. Merge, deployment, DNS/hosted changes and external contact remain outside scope. Existing merchant/staff authentication and payment-provider controls were reused. No production payment credentials were enabled. Real payouts remain disabled. The exchange feature has no execution endpoint or provider connection.

## Changes and reasons

- Rebuilt the public homepage around the existing official GiantPay logo and its blue/red/gold palette. Public product pages now identify GiantPay as a payment gateway for Malawian businesses, with sandbox, planned and partner-dependent services separated.
- Replaced unsupported public claims about certifications, uptime, customer metrics, active payment rails, offices, published SDK packages and production availability. Navigation now includes QR payments, merchant devices and the currency demonstration. Public developer explanations describe the existing API rather than a fictional checkout-session endpoint. Existing pricing code is described as sandbox fee rules rather than an offered production SLA.
- Used the supplied GiantPlus details: Area 46, Lilongwe, Malawi; giantplus-mw.com; info@giantplus-mw.com. The product remains giantpay.mw. Removed a contact form that previously displayed a sent-message state without sending a message; the new page opens an email client through an explicit mailto link.
- Reused Scan-to-Pay creation, amount validation, expiry, usage limits, idempotency, tenant permissions and backend checkout initiation. Generated QR targets now use `https://giantpay.mw/checkout/qr/<opaque-token>` independently of the local frontend origin. Display rejects foreign, insecure or parameter-bearing targets. Existing qrcode-generator encoding is independently decoded with jsQR, including downloaded PNG output in browser acceptance.
- Printed counter displays use the official logo and explain backend confirmation. Print CSS isolates the QR/counter content from dashboard navigation. Expired or exhausted QR codes now show their effective expired state in merchant responses. The shared checkout reservation also checks the persisted QR success count while holding its existing source lock.
- Payment results distinguish pending, processing, successful, failed, cancelled and expired. A cancelled payment no longer falls through to confirmation. Failed-payment wording no longer asserts that no debit occurred. Only trusted backend success displays a receipt. A submitted payment's result takes precedence over a subsequently expired QR code; neither optimistic submission status nor query parameters create a receipt.
- Added a clearly labelled synthetic currency quote calculator. Monetary inputs are parsed directly into BigInt minor units. Rates are rational ratios of invented values; conversions and the illustrative 1.50% fee round half up. Source debit equals the entered source amount plus the fee. The full source amount is converted, with destination rounded to two decimal places. Input edits invalidate the quote; a quote expires after 60 seconds. No external API is called, no trade is submitted and execution stays disabled.
- Replaced the empty-root public SPA response with generated crawlable public HTML from shared content. Added route-specific titles/descriptions, canonical product URLs, social metadata, accurate Organization/WebSite structured data, a public sitemap and an allowlisted robots file. Client metadata clears public canonical/schema/social tags on private routes; APIs return X-Robots-Tag: noindex, nofollow, noarchive. Staff builds do not generate public documents. Private static fallbacks are `spa.html` and `404.html`.
- Stabilized the existing upload-cancellation test with an explicit response gate. The previous 200ms response delay could finish before the test clicked its captured cancel element. Onboarding production logic was not changed.

## Flutterwave verification and external dependencies

Official sources were read on 19 November 2026:

1. [Swap product FAQ](https://flutterwave.com/us/swap): Swap remains restricted to registered, verified users in Nigeria; its purchase currencies are USD, EUR and GBP. Malawi/MWK Swap access is not documented.
2. [Current FX API documentation](https://developer.flutterwave.com/docs/fx): FX requires account enablement. Its documented pairs are NGN/USD, GHS/USD and USD/NGN; MWK is absent. The API uses RFQs, quote-status checks, a quote-bound trade instruction and authoritative trade confirmation. Weekday availability, the documented minimum equivalent to USD 1,000 and five-minute provider quote validity apply to that separate service. The GiantPay demonstration's 60-second expiry and rates/fees are invented and intentionally separate.
3. [Collections payment methods](https://developer.flutterwave.com/docs/collections-inflow/payment-methods): Malawi/MWK appears for card and mobilemoneymalawi collections. Collections availability does not establish Swap/FX eligibility or prove GiantPlus's account permissions.

GiantPlus account eligibility and FX API access have not been verified with an authenticated provider account. Existing checkout credentials are not evidence of access. Exchange execution requires an approved provider contract specifying Malawi authorization, supported MWK pairs, business-account onboarding/KYB and account enablement, funding/settlement currencies and accounts, rates/fees/taxes, quote validity and rounding, transaction limits, compliance responsibilities, signed events, idempotency and recovery, authoritative status verification and provider acceptance. No external party was contacted.

## Merchant devices and NFC

The supplied Aisino image was located and copied unaltered to `public/devices/aisino-reference.png`. It is explicitly captioned as a supplier reference photograph, not GiantPay hardware or a partnership. The homepage's QR stand is an illustration, explicitly not scannable.

A repository search found no Aisino model documentation, terminal SDK, acquiring integration contract or certification evidence. Existing language-SDK marketing was not proof of published packages or terminal integration. A QR display opens browser checkout. An NFC tag can, after separate provisioning/testing, open the same link on a compatible phone; tag provisioning is not implemented here. Neither a tag nor a contactless symbol accepts payment cards. Card terminal integration requires supplier model/SDK/protocol documentation, test hardware, an acquirer agreement, country/account permissions, secure key provisioning and required certification evidence. No raw card details, PIN collection or fake hardware-success flow was added.

## SEO audit, build output and account-access steps

Before this work, index.html had one generic title/description and an empty root. No canonical URL, route metadata system, sitemap, robots file or public structured-data implementation was found. Existing product templates also contained unsupported marketing claims.

The build now generates static public content from the same catalogue used by the React public pages. This is a crawlable static content snapshot, not full React server rendering. The client replaces it on startup. No private state, checkout tokens, references or session data are serialized. Privacy/terms and runtime status retain their existing React pages; they have client metadata but are not included in the generated public-content sitemap. The default index template is noindex until explicitly generated as a public page.

Before any later authorized hosting release, an account owner must:

1. Serve the generated public directory index files at their exact canonical paths, with a consistent trailing-slash policy. Serve existing assets normally. Use `spa.html`, not the public homepage, as the fallback for private/unknown SPA routes. Vite preview implements the private fallback locally; production host behavior must be configured and verified separately.
2. Apply `X-Robots-Tag: noindex, nofollow, noarchive` to private frontend paths and the entire staff origin, including HTML fallback responses before JavaScript runs. Relevant paths include checkout/payment references, login/register/recovery, merchant dashboards, payment links and QR management, onboarding, transaction/report/settings/team/support pages, private developer routes and all staff/admin routes. Do not rely on robots.txt as authorization; existing authentication remains required.
3. Preserve private/API cache and security policies. Confirm public pages are served over HTTPS at giantpay.mw. Verify status codes for unknown paths; 404.html is noindex but a host must actually return a 404 where appropriate. No hosted routing/header configuration was changed here.
4. Verify ownership in Search Console using its approved account workflow. Submit `https://giantpay.mw/sitemap.xml`, inspect representative public URLs without JavaScript and confirm private paths are excluded. No DNS records or Search Console properties were created. Preview/staging hosts should have host-level noindex protection; no ranking guarantees are made.

For local testing, canonical QR links deliberately retain giantpay.mw. Browser acceptance extracts their path and opens it on its disposable local frontend. A phone scanning a local-only record will require an explicitly configured local test routing arrangement; the record has not been deployed to giantpay.mw. Public HTTPS reachability and scanning on physical devices are not established by local decoder/browser tests.

## Local verification

Final check results and exact changed-file inventory are recorded below after completion. The integration services are disposable, synthetic PostgreSQL and Redis containers from compose.improvements-test.yml, bound to loopback ports 55439 and 56389. No real customer account or provider trade/payment is used. Browser acceptance uses the existing synthetic merchant and staff fixture, with staff MFA and separate origins.

### Verification results

- Frontend: `pnpm test --maxWorkers=1` — 39 files, 212 tests passed.
- Backend full suite: `REQUIRE_INTEGRATION_TESTS=true pnpm exec vitest run --maxWorkers=1 --testTimeout=60000 --reporter=json --outputFile=../test-results/backend-final.json` — 457 tests passed, zero failed, zero skipped. PostgreSQL 16 and Redis 7 were used locally; repository CI uses PostgreSQL 17 and Redis 8.
- The initial standard `test:ci` attempt timed out in two existing migration-022 cases at its 15-second threshold while other checks ran. The complete rerun above passed with the stated 60-second allowance. The standard-timeout command is not reported as passed.
- Focused QR management, transactional checkout and initiation tests — 19 passed, including tenant/permission/CSRF checks, canonical opaque QR URLs, bounds, exhausted/expired QR rejection, reservation races and backend verification/ledger behavior.
- Real-API browser acceptance: 7 passed, using Chrome. Merchant QR creation, independent decoding of downloaded PNGs, isolated print content, local customer checkout and signed synthetic backend confirmation passed at 1440px and 390px widths. Staff MFA/session restoration/sign-out and wrong-portal rejection passed. Public product navigation, skip-link keyboard access, supplier reference image, synthetic quote totals, edit invalidation, expiry, disabled execution and QR loading/error recovery passed at both widths. Mobile checks are browser viewport emulation, not physical-device or Safari acceptance.
- Production-output browser checks with JavaScript disabled: 2 passed. Public product/integration content, metadata and sitemap are readable without JavaScript; private fallbacks have noindex headers/metadata and no public canonical. An initial check identified extensionless product URLs falling back to the homepage in Vite preview; explicit mapping to generated HTML fixed it.
- Frontend and backend typechecks passed. Frontend production build passed and generated 31 crawlable public documents. `scripts/check-public-build.mjs` verified all 31 plus sitemap and private fallbacks. Backend production build and compiled-test exclusion passed.
- OpenAPI 3.1 validation passed: 182 paths and 201 operations.
- Migration verification passed: 23 applied on the fresh disposable schema, zero applied on repeat, each recorded once.
- Dependency audit: no known vulnerabilities at audit-level=low.
- Lint: passed with three existing React Hook Form compiler warnings (CreatePaymentLinkForm, UpdateExceptionDialog and CreateScanToPayForm); zero errors.
- Git whitespace validation passed.

The in-app browser had no available backend. Acceptance therefore used the repository's Playwright runner with locally installed Chrome. The first runner completed its assertions but hung during Windows web-server teardown; a reused-server attempt was interrupted as those servers shut down. The final real-API run used explicitly managed disposable servers and finished with exit code 0. These earlier attempts are not counted as final successful runs.

### Remaining limits

No new feature defect is known after the completed local checks. The original outer Git pointer remains broken and untouched. The three existing lint warnings and the standard 15-second backend migration timeout noted above remain recorded limitations. Production hosting rewrites/headers, Search Console access, physical QR scanning/printing, device SDK/card/acquirer acceptance, provider account eligibility and real exchange/payment/payout execution remain externally unverified. Synthetic software tests are not provider acceptance. None of the disabled services was activated.

### Exact source-file inventory

- `.github/workflows/frontend-ci.yml`
- `browser-acceptance/authenticated.spec.ts`
- `browser-acceptance/public-improvements.spec.ts`
- `build-acceptance/public.spec.ts`
- `compose.improvements-test.yml`
- `docs/local-improvements-2026-11-19.md`
- `index.html`
- `package.json`
- `playwright.api.config.ts`
- `playwright.public-build.config.mjs`
- `public/devices/aisino-reference.png`
- `scripts/build-public.mjs`
- `scripts/check-public-build.mjs`
- `server/src/app.ts`
- `server/src/payments/initiateCheckout.ts`
- `server/src/payments/qrCheckoutUrl.ts`
- `server/src/payments/scanToPayRoutes.ts`
- `server/test/qrManagement.integration.test.ts`
- `src/app/App.tsx`
- `src/components/marketing/RouteMetadata.tsx`
- `src/components/navigation/publicNavData.ts`
- `src/content/publicPages.ts`
- `src/content/seo.test.ts`
- `src/content/seo.ts`
- `src/features/checkout/PaymentResult.test.tsx`
- `src/features/checkout/PaymentResult.tsx`
- `src/features/exchange/CurrencyQuoteDemo.tsx`
- `src/features/exchange/demoQuote.test.ts`
- `src/features/exchange/demoQuote.ts`
- `src/features/onboarding/steps/DocumentsStep.test.tsx`
- `src/features/scan-to-pay/checkoutUrl.test.ts`
- `src/features/scan-to-pay/checkoutUrl.ts`
- `src/features/scan-to-pay/QrCheckoutFlow.test.tsx`
- `src/features/scan-to-pay/QrCheckoutFlow.tsx`
- `src/features/scan-to-pay/QrCodeDisplay.tsx`
- `src/features/scan-to-pay/QrCounterDisplay.tsx`
- `src/index.css`
- `src/layouts/PublicLayout/PublicLayout.tsx`
- `src/mocks/fixtures/scanToPay.ts`
- `src/mocks/handlers/scanToPay.ts`
- `src/pages/company/AboutPage.tsx`
- `src/pages/company/CareersPage.tsx`
- `src/pages/company/CompliancePage.tsx`
- `src/pages/company/ContactPage.tsx`
- `src/pages/company/GiantPlusPage.tsx`
- `src/pages/developers/ApiDocumentationPage.tsx`
- `src/pages/developers/CollectionsApiPage.tsx`
- `src/pages/developers/DisbursementsApiPage.tsx`
- `src/pages/developers/OverviewPage.tsx`
- `src/pages/developers/SandboxPage.tsx`
- `src/pages/developers/SdksPage.tsx`
- `src/pages/developers/WebhooksPage.tsx`
- `src/pages/LandingPage.test.tsx`
- `src/pages/LandingPage.tsx`
- `src/pages/PricingPage.tsx`
- `src/pages/PrivacyPage.tsx`
- `src/pages/PublicFeaturePage.tsx`
- `vite.config.ts`
