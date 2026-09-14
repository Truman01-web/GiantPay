ALTER TABLE refunds ADD COLUMN IF NOT EXISTS decision_note text;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS decided_at timestamptz;

CREATE TABLE IF NOT EXISTS audit_events (
  id text PRIMARY KEY,
  actor_id text NOT NULL REFERENCES users(id),
  merchant_id text REFERENCES merchants(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_resource_idx
  ON audit_events(resource_type, resource_id, occurred_at DESC);
