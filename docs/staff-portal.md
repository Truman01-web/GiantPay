# GiantPlus staff portal

The merchant portal remains at `https://giantpay.mw/login`. The separate staff portal is built for `https://admin.giantpay.mw/login`; its API origin is unchanged. Set `STAFF_FRONTEND_ORIGIN` to the exact staff origin. CORS and CSRF accept only the configured merchant or staff origin for its matching host-only session cookie.

Staff access is never inferred from an email domain. An active identity must be explicitly provisioned with one fixed profile, use the exact normalized `@giantplus-mw.com` domain, and complete TOTP MFA before a staff session is issued. Merchant registration accepts valid addresses from any domain and always creates a merchant identity. Merchant and staff cookies, CSRF cookies, challenges, and session database contexts are distinct.

## Local provisioning

The command accepts no CLI arguments so passwords cannot leak into shell history or process listings. Set `STAFF_ACTION=create`, `STAFF_EMAIL`, `STAFF_NAME`, `STAFF_PROFILE`, `STAFF_OPERATOR`, and `STAFF_PASSWORD_FILE`, then run `pnpm staff:provision` in `server`. Creation leaves the identity in `PENDING_VERIFICATION`; entering an address is not proof of mailbox ownership. The password file must be private and temporary. No email is sent.

After an authorized operator independently verifies mailbox control through the approved organizational process, run `STAFF_ACTION=verify-mailbox` with `STAFF_EMAIL`, `STAFF_OPERATOR`, and a non-secret `STAFF_VERIFICATION_REFERENCE`. This audited action activates the identity. Only then can the member sign in and complete mandatory TOTP enrollment.

Other actions are `update-profile`, `suspend`, `activate`, and `revoke`. They require `STAFF_EMAIL` and `STAFF_OPERATOR`; profile updates also require `STAFF_PROFILE`. Suspension, revocation, and profile changes immediately revoke all sessions. Revoked identities cannot be reactivated. Every action writes an audit event. There are no default staff accounts or predefined credentials.

## Profiles

- Compliance: onboarding review and maker-checker decisions.
- Support: merchant and transaction lookup, cases, replies, assignment, and case management.
- Finance: refunds, settlements, reconciliation, ledger integrity, and reports.
- Operations: incidents, operational controls, disputes, notification delivery, health, and metrics.
- Security administration: staff identity, session, and platform audit administration only.

Profiles are fixed least-privilege permission sets. A profile change replaces the staff permission set; arbitrary permissions and unrestricted staff roles are not supported.

## Tested local startup

Use a disposable PostgreSQL database whose name ends in `_test` and an authenticated disposable Redis instance. Keep both bound to loopback. Export `TEST_DATABASE_URL` and `TEST_REDIS_URL` through the local process environment; do not place credentials in tracked files or command-line arguments. Verify Redis with an authenticated `PING` and confirm an unauthenticated `PING` is rejected before running `pnpm test:ci` in `server`.

For an interactive local API, set `FRONTEND_ORIGIN=http://127.0.0.1:5173` and `STAFF_FRONTEND_ORIGIN=http://127.0.0.1:5174`, then run the documented database migration and API start scripts. Build the merchant portal with `VITE_PORTAL_CONTEXT=merchant` and the staff portal with `VITE_PORTAL_CONTEXT=staff`; both use the same API URL but separate exact origins and host-only cookies. Mock API mode must remain disabled for staff acceptance.

Provisioning is deliberately two-step: create the pending identity from a private password file, then record mailbox ownership only after an independently completed organizational check. Local testing may use a clearly synthetic verification reference, but it is not evidence of a hosted mailbox approval and must not be copied into a hosted environment.

## Operational responsibilities still required

Before hosted activation, the organization must name owners and approved procedures for provisioning approval, mailbox-ownership verification, MFA recovery, emergency suspension and revocation, periodic access review, audit-event monitoring, credential and encryption-key storage, backup restoration, incident response, and staff offboarding. This repository does not assign those owners and does not provide proof that any hosted mailbox was verified. Hosted TLS, reverse-proxy cookie handling, origin configuration, monitoring, backups, and recovery drills require separate operational acceptance.
