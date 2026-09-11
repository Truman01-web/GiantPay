CREATE TABLE IF NOT EXISTS merchants (
  id text PRIMARY KEY, name text NOT NULL, environment text NOT NULL DEFAULT 'sandbox',
  onboarding jsonb NOT NULL DEFAULT '{"status":"DRAFT","currentStep":1,"business":{},"owners":[],"documents":[],"settlement":{},"declarationAccepted":false,"timeline":[]}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY, merchant_id text REFERENCES merchants(id), name text NOT NULL,
  email text NOT NULL UNIQUE, password_hash text NOT NULL, role text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}', mfa_enabled boolean NOT NULL DEFAULT false,
  failed_logins integer NOT NULL DEFAULT 0, locked_until timestamptz
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS payment_links (
  id text PRIMARY KEY, merchant_id text NOT NULL REFERENCES merchants(id), token text NOT NULL UNIQUE,
  name text NOT NULL, mode text NOT NULL CHECK (mode IN ('FIXED','CUSTOMER_ENTERED')),
  amount_minor bigint, currency char(3) NOT NULL, description text, customer_reference text,
  status text NOT NULL DEFAULT 'ACTIVE', reusable boolean NOT NULL, max_successful_payments integer,
  successful_payments_count integer NOT NULL DEFAULT 0, redirect_url text, expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_links_merchant_idx ON payment_links(merchant_id, created_at DESC);
CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY, merchant_id text NOT NULL REFERENCES merchants(id), payment_link_id text REFERENCES payment_links(id),
  reference text NOT NULL UNIQUE, merchant_reference text, description text, status text NOT NULL,
  channel text NOT NULL, provider_name text, gross_minor bigint NOT NULL CHECK (gross_minor > 0),
  fee_minor bigint NOT NULL DEFAULT 0, tax_minor bigint NOT NULL DEFAULT 0, currency char(3) NOT NULL,
  refunded_minor bigint NOT NULL DEFAULT 0, customer jsonb NOT NULL DEFAULT '{}',
  reconciliation_state text NOT NULL DEFAULT 'UNRECONCILED', settlement_state text NOT NULL DEFAULT 'NOT_SETTLED',
  provider_submitted_at timestamptz, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_merchant_idx ON payments(merchant_id, created_at DESC);
CREATE TABLE IF NOT EXISTS payment_events (
  id text PRIMARY KEY, payment_id text NOT NULL REFERENCES payments(id), type text NOT NULL,
  label text NOT NULL, detail text, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS refunds (
  id text PRIMARY KEY, merchant_id text NOT NULL REFERENCES merchants(id), payment_id text NOT NULL REFERENCES payments(id),
  reference text NOT NULL UNIQUE, amount_minor bigint NOT NULL CHECK (amount_minor > 0), reason text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING_APPROVAL', requested_by text NOT NULL REFERENCES users(id),
  approved_by text REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (approved_by IS NULL OR approved_by <> requested_by)
);
CREATE INDEX IF NOT EXISTS refunds_merchant_idx ON refunds(merchant_id, created_at DESC);
CREATE TABLE IF NOT EXISTS idempotency_keys (
  merchant_id text NOT NULL, operation text NOT NULL, key text NOT NULL,
  response_status integer NOT NULL, response_body jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, operation, key)
);
