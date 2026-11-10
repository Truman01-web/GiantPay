# Local GiantPay audit — 2026-11-10

The actual files in this checkout were inspected and changed locally. No commits, pushes, merges, deployments, email sends, live payments, payouts, or hosted changes were performed.

## Repository limitations

`AGENTS.md` is absent from the checkout and checked ancestor directories. The `.git` file points to `C:/Users/GMT/Downloads/GiantPay/.git/worktrees/GiantPay-backend`, which is unavailable. Both branch inspection and `git status` fail. Git metadata was left untouched. Consequently, existing changes cannot be distinguished from committed source and there is no reliable Git diff for this audit. Existing source was edited in place without resets or restoration. Builds regenerate local build artifacts.

## Confirmed fixes

- Flutterwave verification exceptions previously fell through to processing a webhook's claimed success, allowing a ledger credit without authoritative verification. Unavailable/pending verification now returns 503 without consuming the event. Mismatches return 409 without posting.
- The sandbox webhook endpoint could invoke the active Flutterwave provider without the Flutterwave route's verification step. It now rejects requests unless the active provider is sandbox. The shared processor checks payment/provider ownership.
- Verification now checks the numeric transaction ID as well as reference, currency and exact minor-unit amount. Non-finite amounts and fractional minor units are rejected. Generic provider status lookup cannot independently authorize a Flutterwave success.
- Failed hosted attempts remain uncertain rather than making a payment permanently FAILED while the hosted page still permits another attempt. Event identities distinguish status notifications. Nullable provider customer fields are accepted, while unrelated event types are rejected.
- Hosted checkout and QR checkout now commit their intent and retry record before network I/O. Transaction-scoped advisory locks serialize same-key requests, and fingerprints reject different payloads sharing a key. Provider failures retain a durable PROCESSING reference; retry never blindly calls the provider again. Payment references use cryptographic IDs.
- Source rows are locked and rechecked for expiry, revocation and capacity at reservation time. In-flight intents reserve limited QR or single-use-link capacity. Verified ledger creation increments source success counters exactly once.
- Provider redirects trigger authoritative verification when a transaction ID is present, then send the customer to the trusted status page. Redirect query status never authorizes payment.
- Hosted URLs must use HTTPS and exactly `checkout.flutterwave.com`, without credentials or alternate ports. Frontend submit responses are validated before navigation. Successful non-JSON API responses now raise a recoverable API error instead of resolving as undefined.
- Checkout retry keys survive lost responses and reloads using session storage without customer PII. The mounted attempt keeps its key. QR requests normalize an omitted customer object.
- QR creation honors the frontend's idempotency key with payload conflict detection. Its mock checkout also implements replay behavior. QR label accessibility errors and unused mock code were repaired.
- Refund requests require a successful payment, reserve pending/approved/processing amounts under a payment lock, and check idempotent replays before recalculating availability. Conflicting refund payloads are rejected. Refund references use cryptographic IDs.
- The provider factory rejects live Flutterwave secret keys. `REAL_PAYOUTS_ENABLED` remains fixed to false. Unconfirmed Flutterwave mobile money/bank channels are unavailable in public checkout; the sandbox retains simulated channels. The unsupported QR instant-settlement claim was removed.
- Added frontend CI for frozen dependency installation, typecheck, lint, tests and a real-API production build. Updated the migration manifest regression expectation for existing migration 022. Added QR and Flutterwave OpenAPI operations and documented uncertain checkout responses.

## Area review and limits

| Area | Local evidence and remaining dependency |
| --- | --- |
| Merchant authentication | Reviewed cookie/CSRF client, merchant session/login flow, guards and existing auth tests. No external email or identity operation performed. |
| Staff authentication | Reviewed separate staff cookies, portal API routing, MFA enrollment/challenge flow, staff identity restrictions and existing security tests. Database-backed staff tests remain unexecuted. |
| Onboarding | Reviewed granular frontend API adapters, secure evidence routes and existing onboarding/evidence tests. SMTP delivery, secure storage deployment and database integration require separate validation. |
| Payments / hosted checkout | Synthetic provider transports and injected Fastify requests cover timeouts, mismatches, pending and successful verification. No provider credentials or network payment was used. |
| Refunds | Request safety improved; approval is an internal workflow. Flutterwave refund execution is intentionally unimplemented and no refund was sent. |
| Settlements | Reviewed maker/checker, reconciliation prerequisite and export-only sandbox workflow. Approval/export do not establish an actual bank payout. No payout integration is implemented or enabled. |
| Reconciliation | Reviewed matching and settlement consumption; pure matching tests pass. Provider statement acquisition and unattended recovery of uncertain Flutterwave intents are not implemented. |
| QR checkout | Server-authoritative fixed amounts, bounded entered amounts, tenant ownership, durable submission and source counters reviewed/fixed. Browser execution and database concurrency need the dependencies below. |

## Verification

- Full frontend suite: **170 passed** before the additional retry/response validation tests. Subsequent focused frontend suite: **15 passed**, including the added tests and existing checkout/API client regressions.
- Full backend suite: **170 passed; 214 skipped**. Skips are database integration cases, not successful validation of those flows. Subsequent focused backend run: **34 passed** after final verification/intent changes.
- Frontend and backend TypeScript checks pass. Both production builds pass; backend distribution check rejects compiled tests successfully.
- Frontend lint passes with **0 errors and 3 warnings** from React Hook Form `watch()` and React compiler compatibility. There is no backend lint script in this checkout.
- OpenAPI validation passes: **3.1.0, 182 paths, 201 operations**. This establishes document validity, not complete runtime contract coverage.
- Chromium checkout E2E attempted: both cases could not launch because the required Playwright Chromium executable is absent. Browser behavior is not claimed as verified.
- Docker daemon is unavailable; no disposable PostgreSQL/Redis test services were available. Migration execution, financial SQL/concurrency, staff sessions and other database integration tests remain blockers. Synthetic DB doubles verify orchestration only.

## Remaining blockers and operational behavior

Keep this system in sandbox/test use. Provider onboarding, approved Malawi currency/channel availability, real provider sandbox acceptance, refund execution, bank integration, email delivery and unattended reconciliation still need separate work and evidence. A crash after reservation or an ambiguous provider outcome intentionally leaves the intent PROCESSING and reserves its source capacity. It requires a verified callback/return or operator reconciliation; do not release capacity or retry the charge merely because a timer elapsed. Retry keys do not prevent two distinct keys or two browser sessions from intentionally initiating separate payments on a reusable checkout.

The existing v3 `verif-hash` authentication mode remains in place. Confirm the account's webhook authentication contract against provider sandbox deliveries before release; no hosted webhook configuration was inspected or modified. No live readiness claim is made.

## Official provider references

- [Flutterwave Standard](https://developer.flutterwave.com/docs/flutterwave-standard-1): server-created hosted URL, return parameters, failed-attempt retries and server verification.
- [Transaction verification](https://developer.flutterwave.com/v3.0.0/docs/transaction-verification): authoritative reference, amount, currency and status checks.
- [Webhooks](https://developer.flutterwave.com/docs/webhooks): notification handling, authentication and independent verification before value is given.
- [Verification by reference](https://developer.flutterwave.com/reference/verify-transaction-with-tx_ref): potential recovery primitive for a future reconciliation worker; not implemented by this change.

## Publishing preparation

Publication was authorized after the audit above. A separate checkout preserves the original directory and broken Git pointer. Its fetch and push origin URLs were verified as `https://github.com/Truman01-web/GiantPay.git`; the feature branch starts at main commit `c1911f84a2487d44236262e8a3ee0c879a268371`. The PR includes the local Flutterwave/QR implementation and migration 022, which were not yet on main, together with the audited fixes. Only selected source, synthetic fixtures/tests, CI and documentation are included; environment files, logs, credentials and build output are excluded. Router changes retain main formatting while preserving the local merchant-route correction and QR routes. No merge or deployment is authorized.

Publishing-checkout verification: frontend full suite 176 passed; backend full suite 170 passed and 214 database integration tests skipped. Both typechecks, frontend lint (zero errors, three existing warnings), OpenAPI validation and builds were rerun against the publishing tree. Staged diff/whitespace checks and a staged-blob credential-pattern scan passed.
