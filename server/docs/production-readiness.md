# Production-readiness foundation

Phase 10 adds sandbox operational controls, private health/metrics views, incident records, bounded shutdown, and recovery checks. It does not make GiantPay production-ready.

Controls are enforced at these boundaries: payment-link creation (`PAYMENT_CREATION_PAUSED`), refund creation (`REFUND_MUTATIONS_PAUSED`), settlement mutation pre-handlers (`SETTLEMENT_PROCESSING_PAUSED`), all dispute POST routes (`DISPUTE_MUTATIONS_PAUSED`), onboarding submit/resubmit (`ONBOARDING_SUBMISSIONS_PAUSED`), and job claims for outbox, webhook, and notification processing. Approved controls expire according to the database timestamp; in-flight jobs are not interrupted.

Metrics use registered route templates and bounded dimensions only. IDs, emails, phone numbers, tokens, keys, raw URLs, raw errors, arbitrary paths, and payload values are forbidden labels. The metrics route requires an authenticated platform session and `platform.metrics.read`.

External providers remain disabled or sandboxed. Required external work includes provider agreements, infrastructure, monitoring, backup storage, restore drills, penetration testing, PCI assessment, legal and regulatory review, accounting approval, staffing, and business-continuity exercises.
