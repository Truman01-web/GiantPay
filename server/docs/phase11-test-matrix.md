# Phase 11 requirement-to-test matrix

| Requirement | Direct verification |
|---|---|
| Multi-stage image, non-root user, bounded health check, no frontend copy | `deployment.test.ts` — uses a multi-stage non-root image with bounded health checking and no frontend copy |
| Separate migration/API/outbox/webhook/notification/reconciliation commands and migration blocking | `deployment.test.ts` — separates migration, API, and every sandbox worker command; blocks application startup when the migration gate fails |
| Read-only runtime, temporary boundary, privileges, restart/resources | `deployment.test.ts` — requires a read-only filesystem, bounded writable temp space, dropped capabilities, restart and resource policy |
| Missing secrets, unsafe production values, sandbox dependencies | `deployment.test.ts` — rejects missing secrets and unsafe production or sandbox provider configuration; accepts an explicitly bounded sandbox configuration |
| Mounted secret handling and redacted errors | `deployment.test.ts` — reads mounted secrets without revealing them in file errors |
| Graceful idempotent shutdown and readiness withdrawal | `operations.test.ts` — graceful shutdown closes HTTP, Redis, and PostgreSQL dependencies after stopping claims; stops claims, bounds draining, closes dependencies, records state, and makes repeated shutdown safe |
| CORS allow/deny, trusted proxy, normalized rate limits | `health.test.ts` — allows only the configured CORS origin; `securityHardening.test.ts` — does not let untrusted forwarding headers…; honors forwarding only when explicitly trusted |
| Public liveness/readiness and bounded dependency failures | `health.test.ts` — returns liveness without dependency details; reports readiness failures without leaking internals |
| Release metadata, dependency inventory, checksums and sandbox posture | `generate-release-metadata.mjs` plus `verify-release.mjs`; exercised by release verification commands |
| No tests, maps, credentials, frontend assets in artifacts | `deployment.test.ts` — keeps tests, source maps, environment files and frontend assets out of the image context; `check:dist`; `release:verify` |
| Deterministic dependency install | Dockerfile frozen-lockfile assertion plus `CI=true pnpm install --frozen-lockfile` |
| TLS/reverse proxy and rollback/recovery consistency | `deployment.test.ts` — documents TLS termination…; keeps rollback and recovery guidance consistent… |
