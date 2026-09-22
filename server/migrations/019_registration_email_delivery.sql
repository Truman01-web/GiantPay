ALTER TABLE registration_email_challenges
  ADD COLUMN IF NOT EXISTS delivery_state text NOT NULL DEFAULT 'PENDING'
    CHECK(delivery_state IN ('PENDING','QUEUED','FAILED','DISABLED')),
  ADD COLUMN IF NOT EXISTS delivery_provider text NOT NULL DEFAULT 'disabled'
    CHECK(delivery_provider IN ('disabled','smtp','test')),
  ADD COLUMN IF NOT EXISTS delivery_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_failure_code text
    CHECK(delivery_failure_code IS NULL OR delivery_failure_code IN ('DELIVERY_REJECTED','DELIVERY_TIMEOUT','DELIVERY_UNAVAILABLE'));

CREATE INDEX IF NOT EXISTS registration_email_challenges_delivery_idx
  ON registration_email_challenges(delivery_state, delivery_attempted_at DESC);
