# Phase 8 requirement-to-test matrix

All named tests are Phase 8 tests in `disputes.integration.test.ts`, `disputesAcceptance.integration.test.ts`, or `disputeRateLimit.integration.test.ts`. Redis policy primitives are additionally exercised by the Phase 8 cases added to `rateLimit.integration.test.ts`.

| # | Requirement | Direct Phase 8 verification |
|---:|---|---|
| 1 | Unauthenticated merchant denial | `enforces authentication, permissions, authority separation, and disabled-user denial` |
| 2 | Unauthenticated platform denial | Same authority test |
| 3 | Merchant without permission | `denies every merchant and platform route group without its database permission` |
| 4 | Platform without permission | Same route-group permission test |
| 5 | Disabled user | Initial authority test |
| 6 | API-key platform denial | `allows scoped API keys on every merchant group and denies them on every platform group` |
| 7 | Authority separation | Initial authority test and complete API-key route-group test |
| 8 | Tenant-isolated lists | `isolates lists, details, responses, evidence, and cross-merchant payment references` |
| 9 | Cross-merchant 404 | Same isolation test |
| 10 | Eligible creation | `creates atomically, replays the original response...` |
| 11 | Invalid payment state | `validates payment eligibility, currency, amounts, provider claims...` |
| 12 | Currency mismatch | Same eligibility test |
| 13 | Zero/negative amount | Same eligibility test plus request-schema validation |
| 14 | Excess amount | Same eligibility test |
| 15 | Partial disputes exceed remainder | Atomic creation test |
| 16 | Duplicate external reference | `serializes duplicate external references and returns one durable winner` |
| 17 | Identical creation retry | Atomic creation test |
| 18 | Changed creation key input | Atomic creation test |
| 19 | Atomic creation audit/outbox | Atomic creation test and audit rollback test |
| 20 | Merchant response | `records idempotent merchant responses...` |
| 21 | Response idempotency | Same test plus changed-input mutation test |
| 22 | Merchant evidence metadata | Same test |
| 23 | Evidence idempotency | Same test plus changed-input mutation test |
| 24 | Unsupported upload behavior | Same test verifies metadata-only response and `uploadAccepted: false` |
| 25 | Internal-note merchant invisibility | `isolates tenant lists/details and keeps internal notes physically private` |
| 26 | Authorized internal-note visibility | Same privacy test |
| 27 | Internal-note idempotency | Changed-input mutation test and original identical note replay |
| 28 | Information-request lifecycle | `uses expected-state locking for information requests...` and lifecycle matrix |
| 29 | Eligible assignment | Expected-state/concurrent assignment test |
| 30 | Ineligible assignee | Same assignment test |
| 31 | Disabled assignee | Same assignment test |
| 32 | Assignment idempotency | Changed-input mutation test and durable replay coverage |
| 33 | Concurrent assignment | Expected-state assignment test proves one 200/one 409 |
| 34 | Valid transitions | `permits every documented lifecycle edge...` enumerates all 15 allowed edges |
| 35 | Invalid transitions | Same test enumerates prohibited representative edges; database rejects every unlisted edge |
| 36 | Stale expected status/version | Information/assignment test and reopen-close race |
| 37 | Decision proposal | Maker-checker tests |
| 38 | Self-approval denial | Original maker-checker test |
| 39 | Independent approval | Both maker-checker tests |
| 40 | Required decision reason | Decision request Zod schema exercised by route-group invalid-payload and normalized validation tests |
| 41 | Applicable evidence references | Changed-input decision test and evidence-ID ownership validation in the decision route; evidence is optional for pending-only sandbox effects |
| 42 | Concurrent terminal decision | `allows exactly one concurrent terminal checker...` |
| 43 | Identical decision replay | Original maker-checker test |
| 44 | Changed decision input | Changed-input mutation test |
| 45 | Reopening | Complete lifecycle matrix and reopen-close race |
| 46 | Reopening permission denial | Every-route permission-denial test includes status/reopen authority |
| 47 | Duplicate financial effect | Concurrent terminal test proves one unique effect |
| 48 | Balanced ledger if applicable | Concurrent terminal test proves pending-only design creates no journal; therefore no dispute posting is applicable |
| 49 | No payout/provider claim | Both maker-checker tests assert `providerAction: false`, `payout: false`, and no journal |
| 50 | Public response append-only | Append-only table tests |
| 51 | Evidence append-only | Append-only table tests |
| 52 | Internal note append-only | Append-only table tests |
| 53 | Status history append-only | Append-only table tests |
| 54 | Decision history append-only | Append-only table tests |
| 55 | Zero-row update/delete rejection | Migration enforcement test iterates every history table |
| 56 | Creation rollback | `rolls back create, response... when audit fails` |
| 57 | Response rollback | Same rollback test plus outbox rollback test |
| 58 | Evidence rollback | Same rollback test |
| 59 | Assignment rollback | Same rollback test |
| 60 | Decision rollback | Same rollback test covers proposal and approval |
| 61 | Financial recording rollback | Terminal approval audit failure proves effect/status/history rollback |
| 62 | Composite cursor stability | Same-timestamp multi-page test |
| 63 | Same-timestamp no loss/duplication | Same-timestamp multi-page test compares exact sets and counts |
| 64 | Invalid cursor | Original cursor validation test |
| 65 | Invalid page size | Original cursor validation test |
| 66 | Valid date filter | Same-timestamp filter/pagination test |
| 67 | Reversed date range | Original cursor validation test |
| 68 | Merchant endpoint rate limits | `enforces response limits independently...` and evidence policy endpoint test |
| 69 | Platform endpoint rate limits | Search and all platform mutation endpoint tests |
| 70 | Identity-isolated limits | Both Phase 8 Redis endpoint tests use second merchant/staff identities |
| 71 | Audit redaction | `redacts audit and outbox metadata separately...` |
| 72 | Outbox redaction | Same test uses an independent payload query |
| 73 | Merchant projection privacy | Tenant/internal-note privacy and redaction tests |
| 74 | Platform projection privacy | Platform detail returns controlled dispute columns and never joins payment customer payloads |
| 75 | No customer secrets | Creation and projection tests seed and reject a sentinel customer token |
| 76 | No card secrets | Migration/schema inspection and projection tests confirm no card/CVV/account fields or payload joins |
| 77 | Migration first pass | `db:verify-migrations`: 13 applied on a fresh `_test` database |
| 78 | Migration repeat | Same command: repeat applied 0 |
| 79 | Migration checksum | Migration runner checksum verification and manifest test |
| 80 | Refund/support regression | Complete `test:ci` executes all refund and support suites with zero failures/skips |

The pending-only financial-effect policy means scenario 48 intentionally has no dispute journal entry to balance. Activating dispute postings requires an approved chart-of-accounts design and new tests; it is not silently treated as implemented.
