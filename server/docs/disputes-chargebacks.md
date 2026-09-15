# Disputes and chargebacks

Phase 8 is an internal, sandbox-only dispute operations foundation. It records customer challenges associated with eligible successful payments, but does not communicate with a card network, bank, mobile-money provider, or payment provider and does not move, hold, pay out, or reverse real funds.

## Authority and privacy

Merchant queries always include the authenticated `merchant_id`; cross-merchant identifiers return the same not-found response as nonexistent records. Merchant permissions are `disputes.read`, `disputes.respond`, and `disputes.evidence.create`. API keys can use merchant routes only when their stored scopes contain the permission. Platform routes require an active human, merchant-less platform session and an explicit `platform.disputes.*` permission. Permissions and account status are loaded from PostgreSQL on every request.

Public responses and evidence metadata are separate from platform-only internal notes. Merchant projections omit internal notes, decision-only reasoning, customer payloads, provider secrets, infrastructure identifiers, and audit metadata. Audit/outbox records contain identifiers and safe classifications, never response or note bodies.

## Lifecycle and concurrency

Allowed transitions are `OPEN` to `NEEDS_MERCHANT_RESPONSE` or `UNDER_REVIEW`; `NEEDS_MERCHANT_RESPONSE` to `MERCHANT_RESPONDED`; `MERCHANT_RESPONDED` to `NEEDS_MERCHANT_RESPONSE` or `UNDER_REVIEW`; `UNDER_REVIEW` to `NEEDS_MERCHANT_RESPONSE` or an independently approved `ACCEPTED`, `CONTESTED`, `WON`, or `LOST`; outcome states to `CLOSED`; and `CLOSED` to `UNDER_REVIEW` with reopening permission and a reason.

PostgreSQL enforces transitions and immutable ownership/financial terms. Mutations require `Idempotency-Key`, recursively canonicalize JSON, take authority-scoped advisory transaction locks, store the original response durably, and conflict on changed-input reuse. Row locks and expected-state fields reject stale writers. Business, history, audit, outbox, and idempotency records commit or roll back together.

Decision proposals require independent review. The creator, proposer, or current material assignee cannot approve the terminal decision. Immutable decision-state history is appended automatically. Public responses, evidence, internal notes, status history, assignment history, decision history, and financial-effect history use statement-level append-only triggers, including zero-row mutation attempts.

## Payment, evidence, and financial boundaries

Creation locks the successful payment and checks currency, positive amount, approved refunds, and prior dispute amounts. Partial disputes cannot exceed the remaining eligible amount. `PROVIDER_REPORTED` is rejected until a verified provider event exists.

Evidence is metadata-only and marked `SANDBOX_METADATA_ONLY`. Safe filenames, MIME types, SHA-256, declared size up to 10 MiB, and a 20-record limit are enforced. No binary upload, bucket, path, signed URL, encryption material, or malware-scanning claim is returned.

The current chart of accounts has no approved dispute semantics. `WON` and `LOST` therefore create one pending sandbox financial-effect instruction and no journal entry. Responses report no provider action and no payout.

## Routes, errors, and production gaps

Merchant routes are list, detail, response, and evidence under `/v1/disputes`. Platform routes are list, detail, create, public response, internal note, request-information, assignment, status, and decisions under `/v1/platform/disputes`.

Normalized errors cover validation, permissions, non-enumerating not found, eligibility/currency/amount failures, invalid lifecycle, stale state, maker-checker, idempotency, assignee, evidence, and rate-limit failures. Unexpected failures remain redacted 500 responses.

Production requires provider/network agreements and authenticated webhooks, approved encrypted evidence storage and malware scanning, retention rules, privacy and PCI reviews, authoritative deadlines, staffed operations, notifications, reviewed dispute ledger accounts, monitoring, incident procedures, and legal/regulatory approval. None is claimed complete.

The complete Phase 8 acceptance mapping is maintained in
[disputes-test-matrix.md](disputes-test-matrix.md).
