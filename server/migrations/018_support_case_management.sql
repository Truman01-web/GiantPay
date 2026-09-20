ALTER TABLE support_cases
  ADD COLUMN linked_transaction_id text REFERENCES payments(id),
  ADD COLUMN escalated_at timestamptz,
  ADD COLUMN resolution_summary text CHECK (resolution_summary IS NULL OR length(trim(resolution_summary)) BETWEEN 3 AND 2000);

ALTER TABLE support_cases DROP CONSTRAINT support_cases_status_check;
ALTER TABLE support_cases ADD CONSTRAINT support_cases_status_check
  CHECK(status IN ('OPEN','IN_PROGRESS','WAITING_ON_MERCHANT','WAITING_FOR_INTERNAL','ESCALATED','RESOLVED','CLOSED'));

DROP TRIGGER support_status_valid ON support_cases;
DROP FUNCTION support_validate_transition();
CREATE FUNCTION support_validate_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF (OLD.status='OPEN' AND NEW.status IN ('IN_PROGRESS','ESCALATED','CLOSED'))
    OR (OLD.status='IN_PROGRESS' AND NEW.status IN ('WAITING_ON_MERCHANT','WAITING_FOR_INTERNAL','ESCALATED','RESOLVED','CLOSED'))
    OR (OLD.status='WAITING_ON_MERCHANT' AND NEW.status IN ('IN_PROGRESS','WAITING_FOR_INTERNAL','ESCALATED','RESOLVED','CLOSED'))
    OR (OLD.status='WAITING_FOR_INTERNAL' AND NEW.status IN ('IN_PROGRESS','WAITING_ON_MERCHANT','ESCALATED','RESOLVED','CLOSED'))
    OR (OLD.status='ESCALATED' AND NEW.status IN ('IN_PROGRESS','WAITING_ON_MERCHANT','WAITING_FOR_INTERNAL','RESOLVED','CLOSED'))
    OR (OLD.status='RESOLVED' AND NEW.status IN ('OPEN','CLOSED')) THEN RETURN NEW;
  END IF;
  RAISE EXCEPTION 'invalid support case transition' USING ERRCODE='23514';
END $$;
CREATE TRIGGER support_status_valid BEFORE UPDATE OF status ON support_cases FOR EACH ROW EXECUTE FUNCTION support_validate_transition();

CREATE FUNCTION support_validate_transaction_link() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.linked_transaction_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM payments WHERE id=NEW.linked_transaction_id AND merchant_id=NEW.merchant_id
  ) THEN
    RAISE EXCEPTION 'support transaction tenant mismatch' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER support_transaction_tenant BEFORE INSERT OR UPDATE OF linked_transaction_id ON support_cases
  FOR EACH ROW EXECUTE FUNCTION support_validate_transaction_link();

CREATE INDEX support_cases_reference_search_idx ON support_cases(reference);
CREATE INDEX support_cases_status_updated_idx ON support_cases(status,updated_at DESC,id DESC);
CREATE INDEX support_cases_priority_updated_idx ON support_cases(priority,updated_at DESC,id DESC);
CREATE INDEX support_cases_owner_updated_idx ON support_cases(assigned_to,updated_at DESC,id DESC);
CREATE INDEX support_cases_transaction_idx ON support_cases(linked_transaction_id) WHERE linked_transaction_id IS NOT NULL;
CREATE INDEX support_cases_escalated_idx ON support_cases(escalated_at DESC) WHERE escalated_at IS NOT NULL;
