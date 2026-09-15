# Platform administration and merchant support

Phase 7 adds a sandbox-only operational support boundary. Merchant authority and platform authority are deliberately separate: merchant sessions require tenant permissions, while merchant-less, active `PLATFORM_ADMIN` sessions require explicit database-backed `platform.*` permissions. API keys cannot enter either human support surface.

## Support lifecycle

`OPEN` may move to `IN_PROGRESS` or `CLOSED`; `IN_PROGRESS` may move to `WAITING_ON_MERCHANT`, `RESOLVED`, or `CLOSED`; `WAITING_ON_MERCHANT` may move to `IN_PROGRESS`, `RESOLVED`, or `CLOSED`; `RESOLVED` may reopen to `OPEN` or move to `CLOSED`. Other transitions are rejected by PostgreSQL. Closing, resolution, and reopening are platform-only operational decisions; the merchant status endpoint always returns `403 SUPPORT_PLATFORM_TRANSITION_REQUIRED`.

Categories are ACCOUNT, ONBOARDING, PAYMENT, REFUND, SETTLEMENT, RECONCILIATION, API_INTEGRATION, WEBHOOK, SECURITY, and OTHER. Priorities are LOW, NORMAL, HIGH, and URGENT; they carry no contractual SLA.

Public messages and internal notes are separate tables and projections. Merchant queries never join internal notes. Messages, notes, status, assignment, and priority history are statement-level append-only, including zero-row UPDATE and DELETE attempts. A case's merchant, creator, and reference cannot change. Assignment is restricted to active, merchant-less platform staff with support permission.

All duplicate-sensitive mutations—including assignment, reassignment, priority, status, resolution, closure, and reopening—use PostgreSQL transactions, row/advisory locks, recursively canonical request hashes, and actor-authority-scoped durable idempotency. Assignment, priority, and status requests include expected current state so concurrent writers produce one winner. Business state, redacted audit metadata, and minimal outbox notification records commit together. Identical retries replay the durable original response; changed-input key reuse returns `IDEMPOTENCY_CONFLICT` and creates no duplicate effects.

Platform audit-log reads create a redacted `PLATFORM_AUDIT_LOG_VIEWED` audit record with only the result count. Cursor values are ISO-8601 timestamps and page sizes are bounded to 100.

## Privacy and operations

Do not include passwords, OTPs, API secrets, complete payment credentials, bank details, or identification numbers in support text. Platform merchant and transaction responses use selected projections; encrypted envelopes, storage references, credentials, customer payloads, and authentication material are excluded. Settlement results explicitly state that no payout occurs.

Attachments and binary uploads are unavailable until approved encrypted storage and malware scanning exist. No email, SMS, provider, KYC, regulatory, refund-execution, payout, or manual-ledger integration is enabled. Production still requires retention and privacy policies, support SLAs, incident response, monitoring, staff access reviews, PCI/privacy assessments, provider agreements, and regulatory approval.
