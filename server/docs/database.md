# Database accounting model

## Chart of accounts

`ledger_accounts` stores currency-specific accounts. Platform accounts have no
merchant ID; merchant payable accounts require one. A null-aware unique key on
owner, merchant, code, and currency prevents duplicate provisioning under
concurrency.

Supported codes are provider clearing, merchant payable, platform fee revenue,
tax payable, refund clearing, and suspense. Refund and suspense accounts are
reserved for controlled future workflows.

## Successful payment

```text
Debit  provider clearing       gross
Credit merchant payable        gross - fee - tax
Credit platform fee revenue    fee (omitted when zero)
Credit tax payable             tax (omitted when zero)
```

Amounts are positive integer minor units. Currency conversion is unsupported.
The database defers balance validation until transaction commit so all
postings can be inserted before it verifies each currency independently.

`journal_entries(source_type, source_id, source_event_id)` uniquely identifies
financial source events. Posted entries and postings are protected by triggers
against update and delete. One linked reversal per original is allowed; its
postings use the same amounts and accounts with opposite directions.

## Transactional outbox

`outbox_events.deduplication_key` prevents duplicate messages. Status moves
from `PENDING` to `PROCESSING`, then `PUBLISHED`, or back to `PENDING` with
bounded exponential delay. Once attempts reach `max_attempts`, status becomes
`FAILED`. Published records are immutable.
## Developer platform tables

Migration `006_developer_platform.sql` adds merchant-owned `api_keys` (keyed
verifiers only), encrypted `merchant_webhook_endpoints`, stable per-endpoint
`webhook_deliveries`, and immutable-numbered `webhook_delivery_attempts`.
Foreign keys, scope/event allowlists, state checks, and unique event/endpoint
pairs enforce tenant ownership and duplicate-delivery safety.
