CREATE TABLE report_exports (
  id text PRIMARY KEY,
  merchant_id text NOT NULL REFERENCES merchants(id),
  report_type text NOT NULL CHECK(report_type IN ('TRANSACTION_ACTIVITY','REFUND_ACTIVITY','PLATFORM_FEES','MERCHANT_LEDGER','RECONCILIATION_RESULTS','SANDBOX_SETTLEMENT_SUMMARIES')),
  currency char(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL CHECK(period_end>period_start),
  status text NOT NULL CHECK(status IN ('COMPLETED','FAILED')),
  requested_by text NOT NULL REFERENCES users(id),
  idempotency_key text NOT NULL,
  request_sha256 char(64) NOT NULL,
  source_snapshot jsonb NOT NULL,
  source_sha256 char(64) NOT NULL,
  content_sha256 char(64),
  csv_content text,
  row_count integer NOT NULL CHECK(row_count>=0),
  failure_code text,
  sandbox_only boolean NOT NULL DEFAULT true CHECK(sandbox_only=true),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(merchant_id,idempotency_key),
  UNIQUE(merchant_id,id)
);
CREATE INDEX report_exports_merchant_idx ON report_exports(merchant_id,created_at DESC,id DESC);

CREATE FUNCTION reject_completed_report_export_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'completed report exports are immutable' USING ERRCODE='55000'; END $$;
CREATE TRIGGER report_exports_completed_immutable BEFORE UPDATE OR DELETE ON report_exports
FOR EACH ROW WHEN (OLD.status='COMPLETED') EXECUTE FUNCTION reject_completed_report_export_mutation();

CREATE FUNCTION reject_audit_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit events are append-only' USING ERRCODE='55000'; END $$;
CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();

CREATE INDEX audit_events_merchant_occurred_idx ON audit_events(merchant_id,occurred_at DESC,id DESC);

UPDATE users SET permissions=(SELECT array_agg(DISTINCT permission) FROM unnest(permissions || ARRAY['reports:read','reports:export','audit:read']) permission) WHERE role='OWNER';
