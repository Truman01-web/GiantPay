# Final review of PR 26

Reviewed base `c1911f8` through requested commit `e9cba3822de726177d331db77868da39c8e0491c`, including the actual local diff and successful frontend/backend CI.

Payment verification binds the provider transaction ID, exact amount, currency and reference before ledger posting. Intent reservation precedes provider I/O; retries reuse stored references without resubmission. Callback processing locks the payment, checks provider ownership and conflicting transaction IDs, and atomically records status, balanced postings, source counters and outbox events. QR capacity is reserved under a source-row lock. QR management and payment listings scope ownership by the authenticated merchant; public checkout uses opaque tokens. Migration 022 is additive and its recorded-021 upgrade, repeat safety and legacy retry compatibility have database-backed coverage.

## Confirmed defect and correction

The custom QR encoder confused payload capacity with data codewords and silently truncated oversized payloads. Independent jsQR decoding failed for a normal checkout URL and two longer URLs at the reviewed commit. Replaced the custom encoder with qrcode-generator automatic sizing, preserving the SVG renderer and four-module quiet zone. All three independent decoding regressions now recover the complete original URL. Provider/payment/ledger behavior is unchanged by this correction.

Encoder API: https://github.com/kazuhikoarase/qrcode-generator

Independent decoder API: https://github.com/cozmo/jsQR

## Cleanup

Docker Desktop's Windows/proxy API hung or returned HTTP 500. The running daemon's actual local socket remained healthy. Cleanup verified Compose project labels and names, removed only the two `giantpay-pr26-review` containers and their labelled network, then verified zero remaining task containers and volumes. There were no task-owned persistent volumes. The unrelated `welcome-to-docker` container was preserved; no global prune, daemon restart or unrelated removal was used.

## Readiness boundary

This is a sandbox/test implementation. Uncertain initiations remain PROCESSING and reserve capacity until a verified callback/return or operator reconciliation; there is no unattended provider recovery worker. Real provider account/channel approval, refunds and banking integration remain outside merge readiness for this sandbox change. Live keys are rejected by the provider factory and real payouts remain disabled. No merge or deployment was performed. Merge readiness requires both updated CI workflows, including enforced backend and authenticated browser checks, to pass on the correction commit.
