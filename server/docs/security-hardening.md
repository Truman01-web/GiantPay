# Security hardening operations

## Reverse proxy and client identity

The supported production topology is `client -> approved TLS reverse proxy -> GiantPay API`.
Set `TRUSTED_PROXIES` to the comma-separated IP addresses or CIDR ranges of only the
immediate proxies that connect to Fastify. With an empty value, forwarding headers are
ignored. Production refuses an empty value. Never use a universal range such as
`0.0.0.0/0`; network policy must also prevent direct access to the application port.

## Redis rate-limit authority

Production requires a TLS `rediss://` `REDIS_URL`. Credentials belong in the deployment
secret manager and are redacted from logs. Counters are incremented and assigned expiry
atomically in Redis, so every application instance shares the same authority. General,
health, login-IP, normalized-login-identity, registration, password, email verification,
invalid API-key, authenticated user, merchant, webhook-management, retry, and
payment/refund mutation buckets are independently keyed with HMAC-SHA256 identifiers.

Sensitive policies fail closed with `503 SECURITY_SERVICE_UNAVAILABLE` during a Redis
outage; production never falls back to memory. Alert on that code, Redis latency/errors,
and sustained `429` counts. Health endpoints stay dependency-minimal and disclose no
addresses. Graceful shutdown quits Redis before PostgreSQL closes and creates no polling
timer in the limiter.

## Browser integration

The configured `FRONTEND_ORIGIN` is the sole credentialed CORS origin. Login returns a
CSRF token and sets `giantpay_csrf`; browser clients must copy it to `X-CSRF-Token` on
cookie-authenticated `POST`, `PUT`, `PATCH`, and `DELETE` requests. The server validates
the request origin when present. Bearer API-key calls are exempt from browser CSRF and
must never put credentials in URLs.

The session cookie is `HttpOnly`, `SameSite=Lax`, path `/`, and `Secure` in production.
Login replaces prior sessions and rotates both session and CSRF values. Logout deletes
the server-side record. Sessions enforce configurable idle and absolute expiry.

## Boundaries and response safety

JSON requests are limited to 1 MiB; provider callbacks to 64 KiB and uploads to 10 MiB.
Unsupported media types are rejected. API responses apply a deny-by-default CSP,
`nosniff`, frame denial, no-referrer policy, and production HSTS. Error responses use a
stable request ID and never include stack traces or dependency configuration.
