# Merchant outbound webhook verification

GiantPay creates events only from committed backend state and uses the stable
outbox event ID for every retry. The JSON envelope contains `id`, `type`,
`createdAt`, and `data`. Delivery is at least once, so persist the event ID and
make processing idempotent.

The endpoint signing secret is displayed only at creation or rotation. Later
responses show a fingerprint. GiantPay stores the recoverable secret with
AES-256-GCM authenticated encryption because delivery must reproduce it;
`WEBHOOK_SECRET_KEY` must be a separately managed production secret.

To verify version `v1`, read the unmodified request bytes, reject stale
timestamps (five minutes is recommended), compute lowercase hex
`HMAC-SHA256(secret, "<GiantPay-Timestamp>.<raw-body-bytes>")`, and compare it
to `GiantPay-Signature` with a constant-time comparison. Also check
`GiantPay-Event-Id`, `GiantPay-Event-Type`, and `GiantPay-Signature-Version`.
Parsing and reserializing JSON before verification can change bytes and fail.

Retries use bounded exponential backoff and stop at the configured maximum.
Redirects are rejected. URLs require HTTPS, ports 443 or implicit 443, no
credentials, and DNS resolution to public IPv4/IPv6 addresses. Targets are
resolved again before delivery, responses and time are bounded, and logs retain
only short sanitized response excerpts. Production additionally requires an
egress firewall/proxy that blocks private and metadata networks; application
DNS checks cannot alone eliminate every rebinding race.

Rotation affects future attempts. During a planned rotation, configure the new
secret and update the receiver immediately. This sandbox does not emit
`refund.succeeded`, because approved refunds are not executed by a provider.
