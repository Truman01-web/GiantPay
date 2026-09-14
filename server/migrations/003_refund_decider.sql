ALTER TABLE refunds ADD COLUMN IF NOT EXISTS decided_by text REFERENCES users(id);

UPDATE refunds SET decided_by = approved_by
WHERE decided_at IS NOT NULL AND decided_by IS NULL;

UPDATE refunds SET approved_by = NULL
WHERE status = 'REJECTED';

ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_decider_not_requester;
ALTER TABLE refunds ADD CONSTRAINT refunds_decider_not_requester
  CHECK (decided_by IS NULL OR decided_by <> requested_by);
