# Notifications and operational communications

Phase 9 provides sandbox-safe notification orchestration. It consumes the
existing transactional outbox rather than creating another event bus.

## Policy and channels

`SECURITY`, `COMPLIANCE`, and `TEAM_ACCESS` in-app notifications are mandatory.
Payment, refund, settlement, reconciliation, onboarding, support, dispute and
system notifications may be preference controlled. There is no marketing
category. Merchant events target trusted active merchant users; operational
events may target active merchant-less platform staff. Arbitrary addresses are
never accepted.

`IN_APP` records are available immediately. `EMAIL` and `SMS` preferences only
record future intent. Their adapters perform no network request and jobs remain
`DISABLED` or `SANDBOXED`. `SENT` and `DELIVERED` require authenticated provider
evidence at the database boundary.

## Templates and event mapping

Templates are keyed, versioned and append-only. Rendering uses only explicit
`{{variable}}` placeholders, exact variable sets, contextual escaping and length
limits. Scripts, links and arbitrary template expressions are rejected.
Mappings cover selected payment, refund, settlement, reconciliation, onboarding,
compliance, support, dispute, team-access and security outbox events; internal
technical events and private note/evidence bodies are excluded.

## Delivery and concurrency

Event receipts uniquely bind outbox event, recipient, channel and template
version. PostgreSQL advisory locks make duplicate or concurrent consumption safe.
Workers claim bounded batches using `FOR UPDATE SKIP LOCKED`, lease ownership and
lease expiry. Attempts are append-only. Retry schedules are bounded and provider
errors are reduced to safe classifications. Retry delay is deterministic capped
exponential backoff, attempts cannot exceed the job maximum, and the final failed
attempt becomes terminal. Terminal and cancelled jobs are not
claimed. No transaction is held while an external provider would be called.

Delivery cancellation is not exposed as a Phase 9 API mutation. The controlled
`CANCELLED` state is reserved for a later approved operations policy.

## Routes and permissions

Merchant inbox routes require active human sessions plus `notifications.read`,
`notifications.mark_read`, or `notifications.manage_preferences`. Platform inbox
and delivery routes require merchant-less `PLATFORM_ADMIN` sessions plus the
corresponding `platform.notifications.*` permission. Unknown or foreign inbox
identifiers return 404. API keys are denied.

Routes are `/v1/notifications`, `/unread-count`, `/preferences`, `/:id/read`, and
`/read-all`, with equivalent platform inbox routes. Platform operations expose
delivery lists/details, template metadata and controlled retry requests.

## Privacy, audit and production boundary

Notification ownership and rendered historical content are immutable. Ordinary
inboxes hide expired records but retain audit evidence. Audit and outbox metadata
contain identifiers, category, channel and safe state—not rendered external
bodies, contact details, credentials, tokens, payment payloads, support messages,
dispute evidence or stack traces. Platform projections contain only masked contact
metadata. Production requires approved providers, sender identities, consent and
retention policies, signed provider webhooks, monitoring, staffing, escalation,
privacy review and regulatory approval.
