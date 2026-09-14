ALTER TABLE audit_events ALTER COLUMN actor_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS payment_attempts (
  id text PRIMARY KEY,
  payment_id text NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_payment_id text,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_attempts_payment_idx
  ON payment_attempts(payment_id, created_at DESC);

INSERT INTO payment_attempts(id,payment_id,provider,status,created_at,updated_at)
SELECT 'pat_' || md5(id),id,coalesce(provider_name,'sandbox'),status,created_at,updated_at
FROM payments
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS webhook_receipts (
  id text PRIMARY KEY,
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  payload_hash char(64) NOT NULL,
  signature_verified boolean NOT NULL,
  processing_status text NOT NULL CHECK (processing_status IN ('RECEIVED','PROCESSED','FAILED','SUSPICIOUS')),
  payment_reference text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  failure_code text,
  UNIQUE(provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS webhook_receipts_payment_idx
  ON webhook_receipts(payment_reference, received_at DESC);
