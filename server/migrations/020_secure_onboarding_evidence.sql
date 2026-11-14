ALTER TABLE onboarding_evidence
  ADD COLUMN scan_state text NOT NULL DEFAULT 'HISTORICAL_METADATA'
    CHECK(scan_state IN ('HISTORICAL_METADATA','QUARANTINED','SCANNING','CLEAN','REJECTED','FAILED')),
  ADD COLUMN scan_failure_code text,
  ADD COLUMN scanner_name text,
  ADD COLUMN scanned_at timestamptz,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN upload_idempotency_key text,
  ADD COLUMN upload_request_sha256 char(64),
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  ADD CONSTRAINT onboarding_evidence_scan_consistency CHECK(
    (scan_state='CLEAN' AND scanned_at IS NOT NULL AND scanner_name IS NOT NULL AND scan_failure_code IS NULL)
    OR (scan_state IN ('REJECTED','FAILED') AND scan_failure_code IS NOT NULL)
    OR scan_state IN ('HISTORICAL_METADATA','QUARANTINED','SCANNING')
  ),
  ADD CONSTRAINT onboarding_evidence_upload_digest CHECK(upload_request_sha256 IS NULL OR upload_request_sha256 ~ '^[0-9a-f]{64}$');

CREATE UNIQUE INDEX onboarding_evidence_upload_idempotency
  ON onboarding_evidence(merchant_id,upload_idempotency_key)
  WHERE upload_idempotency_key IS NOT NULL;

CREATE FUNCTION onboarding_validate_evidence_scan_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.scan_state=NEW.scan_state THEN RETURN NEW; END IF;
 IF NOT ((OLD.scan_state='QUARANTINED' AND NEW.scan_state IN ('SCANNING','FAILED'))
      OR (OLD.scan_state='SCANNING' AND NEW.scan_state IN ('CLEAN','REJECTED','FAILED'))) THEN
   RAISE EXCEPTION 'invalid onboarding evidence scan transition' USING ERRCODE='23514';
 END IF;
 NEW.version=OLD.version+1; NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER onboarding_evidence_scan_transition
  BEFORE UPDATE OF scan_state ON onboarding_evidence
  FOR EACH ROW EXECUTE FUNCTION onboarding_validate_evidence_scan_transition();

COMMENT ON COLUMN onboarding_evidence.scan_state IS
  'HISTORICAL_METADATA denotes legacy metadata-only evidence; it is never downloadable or scanner-verified.';
