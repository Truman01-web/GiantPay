# Merchant onboarding and compliance

Phase 6 is a sandbox-only collection and internal-review foundation. `APPROVED` means only that an authorized GiantPay platform administrator recorded an internal sandbox decision. It is not approval by GiantPay's commercial partners, GiantPlus, a regulator, bank, mobile-money operator, card network, identity provider, or sanctions-screening provider.

## Lifecycle and authority

Applications follow the database-enforced lifecycle `DRAFT → SUBMITTED → UNDER_REVIEW`. Review may lead to `INFORMATION_REQUIRED → RESUBMITTED → UNDER_REVIEW`, or to `APPROVED` or `REJECTED`. Only an approved sandbox application can become `SUSPENDED`. Submitted snapshots, decisions, risk classifications, and transition history are immutable. Concurrent transitions lock the application row, and approval requires a platform administrator other than the reviewer.

Merchant Owner and Administrator roles receive `onboarding:read`, `onboarding:write`, and `onboarding:submit`. These routes require a human browser session; API keys are denied. Platform administrators use separately stored `compliance:read`, `compliance:review`, and `compliance:approve` permissions. Merchant ownership never implies platform compliance authority.

## Sensitive data and evidence

Registration numbers, tax identifiers, identification numbers, settlement-account references, and storage references are encrypted using the existing AES-256-GCM boundary. Responses use masked values and omit encrypted envelopes. Audit and outbox payloads contain identifiers and classifications needed for operations, but not document contents, raw storage references, complete identity numbers, credentials, or encryption material.

Evidence is metadata-only: category, owner, safe file name, permitted media type, bounded byte size, SHA-256 digest, and encrypted opaque storage reference. PostgreSQL never stores document binaries. Only PDF, JPEG, and PNG metadata is accepted, with a 10 MiB maximum. No uploader or storage provider is enabled.

Questionnaire version `2026-01` records merchant declarations about business activity, source of funds, payment expectations, countries, PEP status, sanctions, high-risk activity, third-party processing, refunds, and disputes. These declarations are not external verification results.

## Operations and production blockers

Idempotent submissions, information requests, and decisions use durable request hashes and advisory locks. Changed payloads under a reused key are rejected. Audit and future-notification outbox writes share the business transaction.

Production requires approved document storage and malware scanning, identity and beneficial-owner verification, sanctions and PEP screening, bank-account verification, provider and network agreements, regulatory and legal review, privacy impact assessment, data-subject procedures, breach response, access reviews, and monitored operational runbooks. Retention, deletion, legal-hold, residency, and regulatory-submission policies remain undecided and must be approved before production use.
