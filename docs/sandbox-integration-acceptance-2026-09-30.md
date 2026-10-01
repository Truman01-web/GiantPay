# Sandbox integration acceptance - 2026-09-30

## Baseline

- Branch: `feature/george-sandbox-integration-acceptance`
- Baseline and refreshed `origin/main`: `fa8dfbd714965601496ce8dd047e70b569bd361d`
- Real-mode frontend configuration: `VITE_APP_ENV=sandbox`,
  `VITE_USE_MOCK_API=false`, `VITE_ENABLE_MSW=false`, and
  `VITE_API_URL=https://api.giantpay.mw`

## Fixed in this pass

- Real-mode builds now remove the MSW worker and fixture graph at build time.
  Generated JavaScript contains no `browser-*.js`, `setupWorker`,
  `demo_token_ready`, or `Mocking enabled` signature.
- Successful responses with malformed JSON now reject with a normalized
  `INVALID_RESPONSE` error while retaining safe request/trace references.
- `OPERATIONAL_CONTROL_ACTIVE` explains that the affected service is paused
  and that the request was not processed.
- Login copy describes sandbox settlement records instead of implying live
  settlement operation.
- Merchant onboarding now adapts the backend's masked granular snapshot and
  history, and provides server-backed editing for both addresses, directors,
  beneficial owners, authorized representatives, questionnaire `2026-01`,
  evidence metadata, submission, information responses, and resubmission.
- Merchant-visible information requests are included in the onboarding
  snapshot, so the UI can respond to the exact open request before resubmitting.

## Verified locally

- Frozen workspace install completed from the checked-in lockfile.
- Frontend typecheck, lint (zero errors, two existing React Compiler warnings),
  163 tests in 31 files, and the sandbox real-mode production build passed.
- The real-mode bundle scan found no MSW worker, `setupWorker`, demo-token, or
  mock-enabled signature.
- Backend typecheck, OpenAPI validation (167 paths, 184 operations), build,
  distribution check, and the enforced PostgreSQL/Redis suite passed: 306 tests
  with zero skips.
- Migration verification applied all 19 migrations on the first pass and zero
  on the repeat pass.
- Release metadata was generated before release verification: migration 019
  and 69 checksums verified. Generated metadata was then removed.

## Remaining implementation gaps

- Secure binary evidence storage remains unavailable in real mode. The current
  sandbox workflow registers evidence metadata only; it does not upload or
  verify an object in an approved storage service.
- OpenAPI does not yet cover every implemented team, support, operations,
  dispute, and notification route; route code and focused backend documents
  remain additional evidence.

## Externally blocked gates

- The in-app browser runtime reported no available browser. No authenticated
  desktop/mobile dashboard smoke test or live mutation was performed.
- Read-only HTTPS checks returned 200 for `https://giantpay.mw/` and
  `https://api.giantpay.mw/v1/health`; the API body was `{"status":"ok"}`.
- DNS TXT lookups timed out, so SPF, DKIM, and DMARC were not verified. No DNS
  changes were attempted.
- No live registration was created and no additional email was sent. Prior SMTP
  acceptance remains distinct from inbox delivery evidence.
