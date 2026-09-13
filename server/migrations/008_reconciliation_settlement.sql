CREATE TABLE reconciliation_runs (
  id text PRIMARY KEY,
  merchant_id text NOT NULL REFERENCES merchants(id),
  reconciliation_type text NOT NULL CHECK (reconciliation_type IN ('PAYMENTS','REFUNDS','LEDGER_INTEGRITY','OUTBOX')),
  provider text NOT NULL CHECK (provider='sandbox'), environment text NOT NULL CHECK (environment='sandbox'),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  period_start timestamptz NOT NULL, period_end timestamptz NOT NULL CHECK(period_end>period_start),
  business_date date, status text NOT NULL CHECK(status IN ('RUNNING','COMPLETED','FAILED')),
  source_count integer NOT NULL DEFAULT 0 CHECK(source_count>=0), matched_count integer NOT NULL DEFAULT 0 CHECK(matched_count>=0),
  unmatched_count integer NOT NULL DEFAULT 0 CHECK(unmatched_count>=0), source_total_minor bigint NOT NULL DEFAULT 0,
  internal_total_minor bigint NOT NULL DEFAULT 0, config_snapshot jsonb NOT NULL,
  source_sha256 char(64), failure_summary text, initiated_by text NOT NULL REFERENCES users(id),
  started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  CHECK(matched_count+unmatched_count<=source_count),
  UNIQUE(merchant_id,reconciliation_type,provider,currency,period_start,period_end)
);
CREATE INDEX reconciliation_runs_merchant_idx ON reconciliation_runs(merchant_id,started_at DESC,id DESC);

CREATE TABLE reconciliation_exceptions (
  id text PRIMARY KEY, run_id text NOT NULL REFERENCES reconciliation_runs(id), merchant_id text NOT NULL REFERENCES merchants(id),
  classification text NOT NULL CHECK(classification IN ('MISSING_INTERNAL_RECORD','MISSING_PROVIDER_RECORD','DUPLICATE_INTERNAL_RECORD','DUPLICATE_PROVIDER_RECORD','AMOUNT_MISMATCH','CURRENCY_MISMATCH','STATUS_MISMATCH')),
  source_reference text NOT NULL, evidence jsonb NOT NULL, evidence_sha256 char(64) NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','UNDER_REVIEW','RESOLVED','DISMISSED')),
  claimed_by text REFERENCES users(id), resolution_reason text, resolution_evidence_ref text,
  created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz,
  UNIQUE(run_id,classification,source_reference), UNIQUE(merchant_id,id),
  CHECK((status IN ('RESOLVED','DISMISSED'))=(resolved_at IS NOT NULL)),
  CHECK(status NOT IN ('RESOLVED','DISMISSED') OR (length(trim(resolution_reason))>=3 AND length(trim(resolution_evidence_ref))>=3))
);
CREATE INDEX reconciliation_exceptions_merchant_idx ON reconciliation_exceptions(merchant_id,status,created_at DESC,id DESC);

CREATE TABLE reconciliation_exception_events (
  id text PRIMARY KEY, exception_id text NOT NULL REFERENCES reconciliation_exceptions(id), merchant_id text NOT NULL REFERENCES merchants(id),
  actor_id text NOT NULL REFERENCES users(id), from_status text, to_status text NOT NULL,
  note text, evidence_ref text, idempotency_key text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(merchant_id,idempotency_key)
);

CREATE TABLE compensating_adjustments (
  id text PRIMARY KEY, exception_id text NOT NULL REFERENCES reconciliation_exceptions(id), merchant_id text NOT NULL REFERENCES merchants(id),
  original_entry_id text NOT NULL REFERENCES journal_entries(id), reason text NOT NULL CHECK(length(trim(reason))>=3), evidence_ref text NOT NULL CHECK(length(trim(evidence_ref))>=3),
  status text NOT NULL DEFAULT 'AWAITING_APPROVAL' CHECK(status IN ('AWAITING_APPROVAL','APPROVED','REJECTED')),
  created_by text NOT NULL REFERENCES users(id), approved_by text REFERENCES users(id), journal_entry_id text REFERENCES journal_entries(id),
  idempotency_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz,
  UNIQUE(merchant_id,idempotency_key), UNIQUE(journal_entry_id),
  CHECK(approved_by IS NULL OR approved_by<>created_by), CHECK((status='APPROVED')=(journal_entry_id IS NOT NULL))
);

CREATE TABLE settlement_batches (
  id text PRIMARY KEY, merchant_id text NOT NULL REFERENCES merchants(id), currency char(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
  period_start timestamptz NOT NULL, period_end timestamptz NOT NULL CHECK(period_end>period_start),
  status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','AWAITING_APPROVAL','APPROVED','CANCELLED','EXPORTED')),
  gross_minor bigint NOT NULL CHECK(gross_minor>=0), refunds_minor bigint NOT NULL CHECK(refunds_minor>=0),
  fees_minor bigint NOT NULL CHECK(fees_minor>=0), net_minor bigint NOT NULL,
  input_snapshot jsonb NOT NULL, input_sha256 char(64) NOT NULL, created_by text NOT NULL REFERENCES users(id), approved_by text REFERENCES users(id),
  idempotency_key text NOT NULL, cancellation_idempotency_key text, cancelled_by text REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), submitted_at timestamptz, approved_at timestamptz, cancelled_at timestamptz, exported_at timestamptz,
  external_transfer_executed boolean NOT NULL DEFAULT false CHECK(external_transfer_executed=false),
  UNIQUE(merchant_id,currency,period_start,period_end), UNIQUE(merchant_id,idempotency_key), UNIQUE(merchant_id,cancellation_idempotency_key), UNIQUE(merchant_id,id),
  CHECK(net_minor=gross_minor-refunds_minor-fees_minor), CHECK(approved_by IS NULL OR approved_by<>created_by)
);
CREATE INDEX settlement_batches_merchant_idx ON settlement_batches(merchant_id,created_at DESC,id DESC);

CREATE TABLE settlement_exports (
  id text PRIMARY KEY, batch_id text NOT NULL UNIQUE REFERENCES settlement_batches(id), merchant_id text NOT NULL REFERENCES merchants(id),
  filename text NOT NULL, content_sha256 char(64) NOT NULL, created_by text NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION reject_reconciliation_source_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable reconciliation evidence cannot be modified' USING ERRCODE='55000'; END $$;
CREATE TRIGGER reconciliation_runs_source_immutable BEFORE UPDATE ON reconciliation_runs FOR EACH ROW
WHEN (OLD.config_snapshot IS DISTINCT FROM NEW.config_snapshot OR OLD.source_sha256 IS DISTINCT FROM NEW.source_sha256 OR OLD.period_start IS DISTINCT FROM NEW.period_start OR OLD.period_end IS DISTINCT FROM NEW.period_end)
EXECUTE FUNCTION reject_reconciliation_source_mutation();
CREATE TRIGGER reconciliation_exception_evidence_immutable BEFORE UPDATE ON reconciliation_exceptions FOR EACH ROW
WHEN (OLD.evidence IS DISTINCT FROM NEW.evidence OR OLD.evidence_sha256 IS DISTINCT FROM NEW.evidence_sha256 OR OLD.classification IS DISTINCT FROM NEW.classification) EXECUTE FUNCTION reject_reconciliation_source_mutation();
CREATE TRIGGER reconciliation_exception_delete_immutable BEFORE DELETE ON reconciliation_exceptions FOR EACH ROW EXECUTE FUNCTION reject_reconciliation_source_mutation();
CREATE FUNCTION validate_reconciliation_exception_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF OLD.status='OPEN' AND NEW.status='UNDER_REVIEW' THEN RETURN NEW; END IF;
  IF OLD.status='UNDER_REVIEW' AND NEW.status IN ('RESOLVED','DISMISSED') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'invalid reconciliation exception transition' USING ERRCODE='23514';
END $$;
CREATE TRIGGER reconciliation_exception_transition_valid BEFORE UPDATE OF status ON reconciliation_exceptions
FOR EACH ROW EXECUTE FUNCTION validate_reconciliation_exception_transition();
CREATE TRIGGER settlement_calculation_immutable BEFORE UPDATE ON settlement_batches FOR EACH ROW
WHEN (OLD.status IN ('APPROVED','CANCELLED','EXPORTED') AND (OLD.gross_minor IS DISTINCT FROM NEW.gross_minor OR OLD.refunds_minor IS DISTINCT FROM NEW.refunds_minor OR OLD.fees_minor IS DISTINCT FROM NEW.fees_minor OR OLD.net_minor IS DISTINCT FROM NEW.net_minor))
EXECUTE FUNCTION reject_reconciliation_source_mutation();

UPDATE users SET permissions=(SELECT array_agg(DISTINCT permission) FROM unnest(permissions || ARRAY['reconciliation:read','reconciliation:manage','reconciliation:approve','ledger:integrity','settlements:read','settlements:manage','settlements:approve']) AS permission) WHERE role='OWNER';
