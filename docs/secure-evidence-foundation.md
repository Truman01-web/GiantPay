# Secure onboarding evidence foundation

This implementation was reconstructed in the original React/TypeScript and Node.js/Fastify repository because the earlier isolated-worktree files were not available in this checkout. It is development-only and does not activate production uploads, storage, or scanning.

## Availability policy

`ONBOARDING_EVIDENCE_MODE=secure_binary` requires configured private storage and a real malware scanner. Uploads return an explicit 503 if either adapter is absent, never fall back to metadata registration, and onboarding submission requires at least one non-removed `CLEAN` record.

`ONBOARDING_EVIDENCE_MODE=sandbox_metadata` is accepted only when `DEPLOYMENT_ENVIRONMENT=sandbox` and must be selected explicitly. Every deployment defaults to `secure_binary`, including sandbox deployments, so an existing secure installation cannot be weakened by omission during an upgrade. The browser computes SHA-256 locally and sends metadata only. The server does not accept a storage reference, does not receive or retain the selected binary, and persists the record as `HISTORICAL_METADATA` without scanner name, scan timestamp, or verdict. Such metadata may satisfy internal sandbox-review submission only. Responses, audit/outbox metadata and UI copy state that this does not upload, store, scan, verify, or activate production processing.

Changing to secure mode does not rewrite historical records. `HISTORICAL_METADATA` can never transition to `CLEAN`, cannot be downloaded, and cannot satisfy secure-mode submission. Storage/scanner errors never change the configured mode or trigger a downgrade.

## Security boundary

The server derives the actor and merchant from the authenticated session, verifies `onboarding:write` or `onboarding:read`, and scopes records to that merchant. Clients cannot supply filesystem paths, private storage references, uploader identities, or permanent download URLs. Safe API responses omit internal object references.

Uploads accept one PDF, JPEG, or PNG up to 10 MiB. Filename, extension, declared media type, magic bytes, size, and SHA-256 are checked. These checks only reject obvious mismatches; they do not prove that a document is safe, authentic, readable, or legally valid.

Secure binary evidence moves through `QUARANTINED -> SCANNING -> CLEAN|REJECTED|FAILED`. Only `CLEAN` objects can satisfy secure-mode submission requirements or be downloaded. Scanner errors and timeouts fail closed, delete the quarantined object where possible, and never accept a late clean response. Metadata-only records are `HISTORICAL_METADATA`: they are retained honestly but are neither downloadable nor scanner-verified.

The optional filesystem adapter encrypts each object with AES-256-GCM, uses opaque identifiers, exclusive file creation, private directory/file modes, bounded reads, operation deadlines, quota checks, authentication-tag verification, and symlink/path-traversal rejection. Its root must be outside all public document roots and accessible only to the application service account.

## Activation requirements

- Wire an approved private object-store adapter and an actual malware scanner into `buildApp`; test doubles must never be used in a deployed runtime. Until both are present the endpoints intentionally return 503.
- Keep encryption keys in an approved secret manager, not environment files under a document root or source control. Record key identifiers with ciphertext, support staged rotation and re-encryption, restrict decrypt permission, and test revocation and recovery. The local adapter currently accepts one runtime key and therefore is not sufficient for unattended production rotation.
- Define storage quota alerts, scanner availability objectives, bounded retry policy, and a reconciliation job for orphaned objects. Reconciliation must compare private objects with database records, retain ambiguous objects in quarantine, and use an audited age threshold before deletion.
- Approve retention, merchant-request deletion, regulatory/legal hold, residency, and incident-response rules. Database soft deletion does not itself erase binary content; an authorized asynchronous deletion workflow and immutable audit evidence are required.
- Back up ciphertext, metadata, encryption-key references, and audit records consistently. Test restore into an isolated environment, integrity verification after restore, and disaster recovery without exposing plaintext.
- Monitor failed storage deletion, scanner timeout/error, quota exhaustion, integrity mismatch, idempotency conflict, authorization denial, and abnormal download volume without logging document bytes, private keys, private references, session values, or full sensitive metadata.

## Idempotency, integrity, and auditing

Each upload requires a stable idempotency key. A merchant-scoped advisory lock and unique database index serialize concurrent attempts. Reusing a key with the same request digest returns the original record; changing the payload returns a conflict. Database row locks and a transition trigger enforce the state machine. State changes and authorized downloads write audit events; download audit completion occurs before bytes are released.

The server verifies stored size and SHA-256 before download and emits an attachment name derived from the opaque evidence ID with `Cache-Control: no-store, private` and `X-Content-Type-Options: nosniff`. Storage-reference ciphertext is never returned.

## Operational cleanup

Storage write failure moves the reserved record to `FAILED`. Scanner failure, infection, or timeout attempts immediate object deletion and records safe failure codes. Because process termination can occur between database and storage operations, activation also requires a scheduled, least-privilege orphan reconciler and operator runbook. Cleanup must be idempotent, audited, bounded, tenant-safe, and legal-hold aware; it must never infer that an unknown object is safe to delete merely because a transient database lookup failed.
