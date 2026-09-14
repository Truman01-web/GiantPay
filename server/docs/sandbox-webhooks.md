# Sandbox provider webhooks

The sandbox webhook endpoint is:

```text
POST /v1/webhooks/providers/sandbox
```

It exists only for local development and automated tests. It does not emulate
or connect to a bank, mobile-money operator, switch, or card network.

## Signature

Send these headers:

```text
X-GiantPay-Timestamp: <Unix time in seconds>
X-GiantPay-Signature: <lowercase hex HMAC-SHA256>
Content-Type: application/json
```

The signed bytes are exactly:

```text
<timestamp>.<raw request body bytes>
```

Compute the HMAC with `SANDBOX_WEBHOOK_SECRET`. Do not reformat or parse and
re-serialize JSON before signing. The default timestamp tolerance is 300
seconds and can be configured with `WEBHOOK_TOLERANCE_SECONDS`. Payloads above
64 KiB are rejected.

Example payload:

```json
{
  "eventId": "evt_sandbox_001",
  "eventType": "payment.status.changed",
  "paymentReference": "GP-123",
  "providerPaymentId": "sbx_abc123",
  "status": "SUCCEEDED",
  "occurredAt": "2026-09-11T12:00:00.000Z"
}
```

## Replay behavior

The first valid event reserves a receipt by provider and event ID. An identical
redelivery receives a successful acknowledgement and does not create another
payment event or audit record. Reusing the same event ID with different raw
payload bytes returns `409 WEBHOOK_REPLAY_CONFLICT` and marks the receipt as
suspicious.

Invalid signatures and stale timestamps are rejected before database state is
changed. Unknown payments and invalid state transitions are recorded as failed
receipts. Successful processing locks the payment and atomically updates its
status and latest attempt, creates one payment event and audit record, and
marks the receipt processed.
