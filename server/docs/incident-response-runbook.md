# Incident response runbook

1. An authorized platform operator declares an incident with severity, scope, summary, and an idempotency key.
2. Assign an eligible active incident commander. SEV1 requires immediate human escalation; SEV2 is urgent; SEV3 and SEV4 follow the on-call policy.
3. Record facts in append-only notes. Move through `DECLARED`, `INVESTIGATING`, `IDENTIFIED`, `MONITORING`, `RESOLVED`, and `CLOSED`; the database rejects invalid transitions.
4. If risk reduction requires a control, a maker proposes it and a different authorized checker approves it. Use a bounded expiry whenever possible.
5. Verify sandbox-only behavior, audit/outbox evidence, health, backlog, and ledger integrity before resolution.
6. Close only after monitoring and record the follow-up owner. Never place secrets, personal data, tokens, or credentials in notes.
