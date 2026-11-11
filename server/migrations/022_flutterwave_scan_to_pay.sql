-- Migration 022: Flutterwave provider support + Scan-to-Pay
-- Adds provider_transaction_id and provider_checkout_url to payments,
-- and creates the scan_to_pay_codes table.

-- Flutterwave stores a numeric transaction ID and a hosted checkout URL.
-- Both are optional so existing sandbox payments are unaffected.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider_transaction_id text,
  ADD COLUMN IF NOT EXISTS provider_checkout_url   text;

-- Unique index so we can prevent double-posting when FLW sends the
-- same transaction ID in multiple webhooks.
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_transaction_id_idx
  ON payments(provider_name, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

-- Scan-to-pay codes.  Each code is a merchant-owned QR target.
-- The public-facing URL is /checkout/qr/<opaque_id> where opaque_id is a
-- random token — it never encodes amounts or secrets.
CREATE TABLE IF NOT EXISTS scan_to_pay_codes (
  id                  text PRIMARY KEY,
  merchant_id         text NOT NULL REFERENCES merchants(id),
  created_by          text NOT NULL REFERENCES users(id),

  -- Display / business metadata
  label               text NOT NULL,                  -- e.g. "Counter 3"
  currency            char(3) NOT NULL DEFAULT 'MWK',

  -- Amount mode:
  --   FIXED            — amount_minor is set; payer cannot change it.
  --   CUSTOMER_ENTERED — payer enters amount; server validates min/max.
  mode                text NOT NULL DEFAULT 'FIXED'
                        CHECK (mode IN ('FIXED', 'CUSTOMER_ENTERED')),
  amount_minor        bigint CHECK (amount_minor IS NULL OR amount_minor > 0),
  min_amount_minor    bigint CHECK (min_amount_minor IS NULL OR min_amount_minor > 0),
  max_amount_minor    bigint CHECK (max_amount_minor IS NULL OR max_amount_minor > 0),

  -- Public opaque token used in the checkout URL — never the ID.
  token               text NOT NULL UNIQUE,

  -- Lifecycle
  status              text NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'DISABLED', 'EXPIRED')),
  expires_at          timestamptz,

  -- Counters
  successful_payments_count integer NOT NULL DEFAULT 0,
  max_successful_payments   integer,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- Business rules enforced at DB level
  CONSTRAINT scan_to_pay_fixed_needs_amount
    CHECK (mode <> 'FIXED' OR amount_minor IS NOT NULL),
  CONSTRAINT scan_to_pay_range_valid
    CHECK (
      min_amount_minor IS NULL OR max_amount_minor IS NULL
      OR min_amount_minor <= max_amount_minor
    )
);

CREATE INDEX IF NOT EXISTS scan_to_pay_merchant_idx
  ON scan_to_pay_codes(merchant_id, created_at DESC);

-- Payments originating from a scan-to-pay code reference it here.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS scan_to_pay_code_id text
    REFERENCES scan_to_pay_codes(id);

-- Index for the reverse join (which payments came from a given QR code).
CREATE INDEX IF NOT EXISTS payments_scan_to_pay_code_idx
  ON payments(scan_to_pay_code_id)
  WHERE scan_to_pay_code_id IS NOT NULL;
