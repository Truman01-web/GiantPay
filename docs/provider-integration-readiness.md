# Provider integration readiness

## Current boundary

OneKhusa is integrated as a sandbox-only mobile-money push provider alongside the deterministic sandbox adapter. OneKhusa production collections remain rejected by configuration. Live provider contracts, credentials, settlement setup, certification, and payout API access are not configured. No live endpoint or production behavior is inferred while commercial access remains pending.

The OneKhusa callback implementation checks signed raw-body HMACs, compares the callback amount with the durable intent, resolves both published reference fields, records provider reversals in the ledger, and acknowledges successful callbacks with HTTP 200. A real signed sandbox capture is still required to confirm which reference field contains the submitted reference. Synthetic signed fixtures do not satisfy that acceptance requirement.

Automatic inquiry recovery is available for OneKhusa when `PAYMENT_RECOVERY_ENABLED=true` and the reconciliation worker is running. It only applies an inquiry result after matching the submitted reference, amount, and currency. Provider initiated refunds remain disabled: the public OneKhusa documentation located for this integration only describes a sandbox reversal simulator, not an approved production refund endpoint or its operational requirements.

Confirmed public pricing is 3% per successful Airtel Money, TNM Mpamba, or card collection and 2% per successful bank-transfer collection. Account setup and monthly platform fees are free. Failed payments create no fee revenue. Provider commercial costs and tax treatment remain separate confirmations.

## Activation prerequisites

- Approved provider contracts and authoritative API specifications.
- Separate sandbox and production credentials held outside source control.
- Authenticated callback/signature and replay-protection requirements.
- Provider-specific status, retry, timeout, reversal, refund, and reconciliation semantics.
- OneKhusa provider approval, production credentials and endpoint confirmation, settlement setup, and a verified signed sandbox callback capture covering success, failure, reversal, reference mapping, and amount mapping.
- A documented and approved live OneKhusa refund/reversal endpoint before enabling provider refund execution; the sandbox simulator must not be used for live funds.
- Operational ownership, monitoring, incident response, and certification evidence.
- Regulatory and legal approval for the intended service and customer data.

Until every applicable prerequisite is verified, `PAYMENT_PROVIDER=sandbox` and `REAL_PAYOUTS_ENABLED=false` remain mandatory.

## Onboarding evidence storage design

No approved binary evidence store or malware-scanning service is configured. The development foundation now has authenticated upload/download routes, persistent quarantine state, an injectable private store, and a mandatory scanner interface. In `secure_binary` mode the upload route returns `503 EVIDENCE_SERVICE_UNAVAILABLE` unless both adapters are supplied and never downgrades. `sandbox_metadata` is restricted to sandbox deployments and records only client-computed metadata as `HISTORICAL_METADATA`; it may support internal sandbox review but cannot activate production or imply that a document was uploaded, stored, scanned, authentic, or verified.

Activation must provide and verify:

1. Tenant-scoped authorization before upload initiation, completion, or download.
2. Private encrypted object storage outside every public document root, using opaque references rather than user-controlled paths.
3. Server-side allowlisted media-type, extension, size, magic-byte, digest, and filename validation (PDF/JPEG/PNG, maximum 10 MiB under the current contract).
4. Quarantine on receipt and an approved malware scanner; evidence cannot become usable until a clean result is recorded.
5. Short-lived, audience-bound access or server-streamed downloads with no permanent public URL.
6. Retention, deletion, legal-hold, residency, backup, recovery, and audit policies approved before activation.
7. Idempotent completion, digest verification, orphan cleanup, bounded retry, and safe failure states.
8. Separate least-privilege service credentials supplied through private configuration, never logs, frontend variables, source control, or API responses.

Required configuration names should be finalized only with the selected provider. At minimum the runtime will need a private endpoint/region, bucket or container identifier, upload/download signing identity, encryption-key reference, scanner/quarantine integration, maximum size, allowed content types, access TTL, and retention policy identifier. Selecting or purchasing that service is outside this milestone.
