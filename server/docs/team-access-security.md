# Team access and account security

Phase 5 adds merchant-scoped human access controls without enabling real payments or delivery providers.

## Roles and permissions

Migration 010 creates database-backed Owner, Administrator, Finance, Developer, Support, and Viewer roles for each existing merchant and assigns existing merchant owners to the Owner role. Platform administrators have no merchant ID and are never backfilled. A canonical backend registry rejects unknown permissions and prevents non-owners from granting capabilities they do not hold. Authorization reads current role permissions on every authenticated request, so changes take effect without restart. API-key scopes remain independent and API keys are denied from all team and account-security routes.

All team SQL includes the authenticated merchant ID. Cross-merchant resources return 404. System roles cannot be treated as custom roles. Archived roles cannot receive assignments. Team mutations run in transactions and write audit evidence.

## Final owner

Owner changes lock the merchant row and count other active owners inside the transaction. Demotion, suspension, removal, and assignment deletion must leave another active owner. Self-demotion shortcuts are rejected. Concurrent mutations serialize on the merchant row.

## Invitations

Invitation email addresses are trimmed and lowercased. Tokens use cryptographic randomness and only SHA-256 hashes are stored in the invitation table. Pending email uniqueness is enforced per merchant. Delivery uses the transactional outbox; its payload contains an AES-256-GCM ciphertext, never the plaintext token. Because no production email provider is connected, the current sandbox create and resend responses also return the newly generated plaintext token once. It is absent from list and later retrieval responses; token hashes and encryption material are never returned. Production email delivery remains explicitly out of scope. Invitations expire after 72 hours and lifecycle records are durable.

Acceptance deliberately requires an existing user whose normalized email and merchant both match the invitation. It can reactivate that matching membership and assign the invited role, but it cannot create an identity, attach a different email, or move an identity between merchants. Creating a new identity from production email onboarding remains out of scope.

## MFA and recovery

MFA is authenticator-app TOTP only, with a 30-second RFC 6238 counter and one-step clock skew. Secrets are returned only at enrollment and stored under the existing AES-256-GCM encryption boundary. Enrollment is inactive until a valid code is verified. The last accepted counter prevents replay. Login challenges expire after five minutes and are single-use. Ten high-entropy recovery codes are displayed once and stored as independent hashes. Regeneration invalidates old codes. Disabling MFA and regenerating codes require MFA verification on the current session within ten minutes.

## Passwords and sessions

Password-reset requests always return the same 202 response. New requests invalidate older unused requests, store only a token hash, expire after 30 minutes, and enqueue encrypted delivery material. Completion is single-use, hashes the new password with Argon2id plus the configured pepper, revokes all sessions, and creates an audit event. API keys remain unaffected.

Sessions expose only opaque public IDs and timestamps, never cookie or token values. Users may revoke one other session or all other sessions. Suspension, removal, and password reset revoke all sessions. Authentication rejects suspended and removed users.

## Operations and incidents

Security endpoints use the existing CSRF, normalized-error, global rate-limit, identity-limit, and Redis production boundaries. Operators should revoke sessions, preserve append-only audit evidence, rotate affected encryption/pepper material through a reviewed procedure, and investigate outbox failures without logging credentials.

Production requires an approved email delivery adapter, privacy and retention policies, privileged-access reviews, recovery support procedures, key rotation, monitored PostgreSQL and Redis, penetration testing, MFA usability review, and an independent security assessment.
