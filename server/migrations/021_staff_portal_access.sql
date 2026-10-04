ALTER TABLE users ADD COLUMN staff_profile text;
ALTER TABLE users ADD COLUMN staff_provisioned_at timestamptz;
ALTER TABLE users ADD COLUMN staff_provisioned_by text;
ALTER TABLE users ADD CONSTRAINT users_staff_profile_check CHECK (
  staff_profile IS NULL OR staff_profile IN ('COMPLIANCE','SUPPORT','FINANCE','OPERATIONS','SECURITY_ADMIN')
);
ALTER TABLE users ADD CONSTRAINT users_staff_identity_check CHECK (
  staff_profile IS NULL OR (
    merchant_id IS NULL AND role='PLATFORM_ADMIN' AND status IN ('ACTIVE','PENDING_VERIFICATION','SUSPENDED','REMOVED')
    AND normalized_email ~ '^[^@]+@giantplus-mw[.]com$'
  )
);
CREATE INDEX users_active_staff_idx ON users(staff_profile,status) WHERE staff_profile IS NOT NULL;

ALTER TABLE sessions ADD COLUMN session_context text NOT NULL DEFAULT 'MERCHANT';
ALTER TABLE sessions ADD CONSTRAINT sessions_context_check CHECK(session_context IN ('MERCHANT','STAFF'));
CREATE INDEX sessions_context_user_idx ON sessions(session_context,user_id);

ALTER TABLE authentication_challenges ADD COLUMN session_context text NOT NULL DEFAULT 'MERCHANT';
ALTER TABLE authentication_challenges ADD CONSTRAINT authentication_challenges_context_check CHECK(session_context IN ('MERCHANT','STAFF'));

COMMENT ON COLUMN users.staff_profile IS 'Explicitly provisioned GiantPlus staff profile; a matching email domain alone grants no access.';
COMMENT ON COLUMN sessions.session_context IS 'Separates merchant and staff browser authentication contexts.';
