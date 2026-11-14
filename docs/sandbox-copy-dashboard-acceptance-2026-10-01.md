# Sandbox copy and dashboard acceptance - 2026-10-01

## Baseline

- Feature branch: `feature/george-settlement-reconciliation-completion`
- Merged baseline: `913d0b59ccb7a5e705ad921d58d2eb2641f7f1c6`
- Existing unstaged public-copy work in the separate `GiantPay` worktree was inspected read-only and preserved there.

## Implemented in this milestone

- Permission-aware sandbox settlement creation, submit, cancel, independent approval, and CSV export controls.
- Exact integer-string settlement amount display without unsafe `Number` conversion.
- Creator identity in settlement responses so self-approval and missing-identity cases fail closed in the UI.
- Stable create, cancel, exception-review, and adjustment-request idempotency keys across uncertain retries.
- Reconciliation exception review, compensating-adjustment request/decision UI, and permission-gated ledger-integrity results.
- Explicit disclosure that the backend has no adjustment list/history route; the frontend does not fabricate one.
- Metadata-only onboarding evidence design and activation requirements for a future approved private storage service.
- Correct sandbox/provider wording and confirmed 3% mobile-money/card and 2% bank-transfer pricing boundaries.

## Acceptance boundary

Authenticated browser acceptance requires an authorized disposable account. No registration, OTP email, merchant application, provider call, payout, or production financial mutation is performed without that authorization. Automated local checks provide independent contract and regression evidence but do not substitute for inbox receipt or an authenticated browser session.
