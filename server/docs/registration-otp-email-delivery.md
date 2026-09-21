# Registration OTP email delivery

Registration codes are stored only as HMACs. API responses, application logs, audit events and outbox payloads must never contain the code. Delivery audit metadata contains only state, provider, time and a masked destination.

External delivery is off by default. To enable the SMTP adapter, provide protected environment variables or mount the password through `SMTP_PASSWORD_FILE`:

```env
EXTERNAL_DELIVERY_ENABLED=true
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.invalid
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@giantpay.mw
SMTP_PASSWORD_FILE=/run/secrets/smtp_password
SMTP_FROM=GiantPay <no-reply@giantpay.mw>
SMTP_TIMEOUT_MS=5000
```

Startup fails if enabled configuration is incomplete, insecure, uses a sender outside `giantpay.mw`, or is enabled under `NODE_ENV=test`. The adapter uses implicit TLS with certificate verification and TLS 1.2 or newer. Provider rejection and timeout responses are normalized; complete SMTP replies are not logged or returned.

Before production activation, the hosting administrator must create the approved mailbox or SMTP credential, mount the secret, confirm outbound SMTP access, and publish/verify SPF, DKIM and DMARC for `giantpay.mw`. These external steps are not performed by this repository change.
