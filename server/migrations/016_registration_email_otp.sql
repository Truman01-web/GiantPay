ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK(status IN ('PENDING_VERIFICATION','ACTIVE','SUSPENDED','REMOVED'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS registration_email_challenges (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_hash text NOT NULL,
  otp_hmac text NOT NULL,
  expires_at timestamptz NOT NULL,
  resend_available_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count BETWEEN 0 AND 5),
  used_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS registration_email_challenges_user_idx ON registration_email_challenges(user_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS registration_email_challenges_active_user_idx ON registration_email_challenges(user_id) WHERE used_at IS NULL AND invalidated_at IS NULL;

CREATE OR REPLACE FUNCTION prevent_registration_challenge_secret_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id<>OLD.user_id OR NEW.destination_hash<>OLD.destination_hash OR NEW.otp_hmac<>OLD.otp_hmac OR NEW.expires_at<>OLD.expires_at OR NEW.created_at<>OLD.created_at THEN
    RAISE EXCEPTION 'registration challenge secrets are immutable';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS registration_challenge_secret_guard ON registration_email_challenges;
CREATE TRIGGER registration_challenge_secret_guard BEFORE UPDATE ON registration_email_challenges FOR EACH ROW EXECUTE FUNCTION prevent_registration_challenge_secret_changes();
