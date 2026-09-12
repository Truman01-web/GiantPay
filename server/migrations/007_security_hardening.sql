ALTER TABLE sessions ADD COLUMN IF NOT EXISTS absolute_expires_at timestamptz;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
UPDATE sessions SET absolute_expires_at=expires_at WHERE absolute_expires_at IS NULL;
UPDATE sessions SET last_seen_at=created_at WHERE last_seen_at IS NULL;
ALTER TABLE sessions ALTER COLUMN absolute_expires_at SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN last_seen_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at,absolute_expires_at,last_seen_at);
