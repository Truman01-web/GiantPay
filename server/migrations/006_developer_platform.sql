-- Sandbox developer credentials and merchant outbound webhook delivery.
CREATE TABLE api_keys (
  id text PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  merchant_id text NOT NULL REFERENCES merchants(id),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  verifier char(64) NOT NULL,
  fingerprint text NOT NULL,
  scopes text[] NOT NULL,
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (scopes <@ ARRAY['payments:read']::text[]),
  CHECK (cardinality(scopes) > 0)
);
CREATE INDEX api_keys_merchant_idx ON api_keys(merchant_id,created_at DESC);

CREATE TABLE merchant_webhook_endpoints (
  id text PRIMARY KEY,
  merchant_id text NOT NULL REFERENCES merchants(id),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  url text NOT NULL,
  event_types text[] NOT NULL,
  secret_ciphertext text NOT NULL,
  secret_fingerprint text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (event_types <@ ARRAY['payment.processing','payment.succeeded','payment.failed','refund.pending_approval','refund.approved','refund.rejected']::text[]),
  CHECK (cardinality(event_types) > 0),
  UNIQUE(merchant_id,id)
);
CREATE INDEX merchant_webhooks_merchant_idx ON merchant_webhook_endpoints(merchant_id,created_at DESC);

CREATE TABLE webhook_deliveries (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES outbox_events(id),
  endpoint_id text NOT NULL REFERENCES merchant_webhook_endpoints(id),
  merchant_id text NOT NULL REFERENCES merchants(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PROCESSING','SUCCEEDED','FAILED')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count >= 0),
  max_attempts integer NOT NULL CHECK(max_attempts BETWEEN 1 AND 20),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  succeeded_at timestamptz,
  last_http_status integer,
  last_error_class text,
  last_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id,endpoint_id),
  UNIQUE(merchant_id,id)
);
CREATE INDEX webhook_deliveries_claim_idx ON webhook_deliveries(status,next_attempt_at,created_at);

CREATE TABLE webhook_delivery_attempts (
  id text PRIMARY KEY,
  delivery_id text NOT NULL REFERENCES webhook_deliveries(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL CHECK(attempt_number > 0),
  http_status integer,
  error_class text,
  response_excerpt text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(delivery_id,attempt_number)
);
