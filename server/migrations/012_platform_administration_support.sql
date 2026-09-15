CREATE TABLE support_cases (
 id text PRIMARY KEY, reference text NOT NULL UNIQUE, merchant_id text NOT NULL REFERENCES merchants(id), created_by text NOT NULL REFERENCES users(id),
 category text NOT NULL CHECK(category IN ('ACCOUNT','ONBOARDING','PAYMENT','REFUND','SETTLEMENT','RECONCILIATION','API_INTEGRATION','WEBHOOK','SECURITY','OTHER')),
 subject text NOT NULL CHECK(length(trim(subject)) BETWEEN 3 AND 160), status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','IN_PROGRESS','WAITING_ON_MERCHANT','RESOLVED','CLOSED')),
 priority text NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('LOW','NORMAL','HIGH','URGENT')), assigned_to text REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz, closed_at timestamptz,
 last_merchant_activity_at timestamptz NOT NULL DEFAULT now(), last_staff_activity_at timestamptz, UNIQUE(merchant_id,id)
);
CREATE INDEX support_cases_merchant_page_idx ON support_cases(merchant_id,created_at DESC,id DESC);
CREATE INDEX support_cases_platform_page_idx ON support_cases(status,priority,updated_at DESC,id DESC);

CREATE TABLE support_public_messages (
 id text PRIMARY KEY, case_id text NOT NULL REFERENCES support_cases(id), merchant_id text NOT NULL REFERENCES merchants(id), author_id text NOT NULL REFERENCES users(id),
 author_domain text NOT NULL CHECK(author_domain IN ('MERCHANT','PLATFORM')), body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 10000), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(merchant_id,id)
);
CREATE INDEX support_public_messages_case_idx ON support_public_messages(case_id,created_at,id);
CREATE TABLE support_internal_notes (
 id text PRIMARY KEY, case_id text NOT NULL REFERENCES support_cases(id), merchant_id text NOT NULL REFERENCES merchants(id), author_id text NOT NULL REFERENCES users(id),
 body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 10000), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(merchant_id,id)
);
CREATE INDEX support_internal_notes_case_idx ON support_internal_notes(case_id,created_at,id);
CREATE TABLE support_status_history (
 id text PRIMARY KEY, case_id text NOT NULL REFERENCES support_cases(id), merchant_id text NOT NULL REFERENCES merchants(id), actor_id text NOT NULL REFERENCES users(id),
 from_status text, to_status text NOT NULL, reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 1000), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_status_history_case_idx ON support_status_history(case_id,created_at,id);
CREATE TABLE support_assignment_history (
 id text PRIMARY KEY, case_id text NOT NULL REFERENCES support_cases(id), merchant_id text NOT NULL REFERENCES merchants(id), actor_id text NOT NULL REFERENCES users(id),
 from_staff_id text REFERENCES users(id), to_staff_id text NOT NULL REFERENCES users(id), reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 1000), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_assignment_history_case_idx ON support_assignment_history(case_id,created_at,id);
CREATE TABLE support_priority_history (
 id text PRIMARY KEY, case_id text NOT NULL REFERENCES support_cases(id), merchant_id text NOT NULL REFERENCES merchants(id), actor_id text NOT NULL REFERENCES users(id),
 from_priority text, to_priority text NOT NULL, reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 1000), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_priority_history_case_idx ON support_priority_history(case_id,created_at,id);
CREATE TABLE support_idempotency (
 authority_scope text NOT NULL, operation text NOT NULL, idempotency_key text NOT NULL, request_sha256 char(64) NOT NULL,
 response_status integer NOT NULL, response_body jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(authority_scope,operation,idempotency_key)
);

CREATE FUNCTION support_validate_tenant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner text;
BEGIN SELECT merchant_id INTO owner FROM support_cases WHERE id=NEW.case_id; IF owner IS NULL OR owner<>NEW.merchant_id THEN RAISE EXCEPTION 'support tenant mismatch' USING ERRCODE='23514'; END IF; RETURN NEW; END $$;
CREATE TRIGGER support_public_message_tenant BEFORE INSERT ON support_public_messages FOR EACH ROW EXECUTE FUNCTION support_validate_tenant();
CREATE TRIGGER support_internal_note_tenant BEFORE INSERT ON support_internal_notes FOR EACH ROW EXECUTE FUNCTION support_validate_tenant();
CREATE TRIGGER support_status_tenant BEFORE INSERT ON support_status_history FOR EACH ROW EXECUTE FUNCTION support_validate_tenant();
CREATE TRIGGER support_assignment_tenant BEFORE INSERT ON support_assignment_history FOR EACH ROW EXECUTE FUNCTION support_validate_tenant();
CREATE TRIGGER support_priority_tenant BEFORE INSERT ON support_priority_history FOR EACH ROW EXECUTE FUNCTION support_validate_tenant();
CREATE FUNCTION support_validate_assignment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.assigned_to IS NOT NULL AND NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.assigned_to AND merchant_id IS NULL AND role='PLATFORM_ADMIN' AND status='ACTIVE' AND permissions @> ARRAY['platform.support.read']) THEN RAISE EXCEPTION 'assignee is not eligible' USING ERRCODE='23514'; END IF; RETURN NEW; END $$;
CREATE TRIGGER support_assignment_valid BEFORE INSERT OR UPDATE OF assigned_to ON support_cases FOR EACH ROW EXECUTE FUNCTION support_validate_assignment();
CREATE FUNCTION support_case_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.merchant_id<>NEW.merchant_id OR OLD.created_by<>NEW.created_by OR OLD.reference<>NEW.reference THEN RAISE EXCEPTION 'support case ownership is immutable' USING ERRCODE='55000'; END IF; RETURN NEW; END $$;
CREATE TRIGGER support_case_ownership_immutable BEFORE UPDATE ON support_cases FOR EACH ROW EXECUTE FUNCTION support_case_immutable();
CREATE FUNCTION support_validate_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status=OLD.status THEN RETURN NEW; END IF; IF (OLD.status='OPEN' AND NEW.status IN ('IN_PROGRESS','CLOSED')) OR (OLD.status='IN_PROGRESS' AND NEW.status IN ('WAITING_ON_MERCHANT','RESOLVED','CLOSED')) OR (OLD.status='WAITING_ON_MERCHANT' AND NEW.status IN ('IN_PROGRESS','RESOLVED','CLOSED')) OR (OLD.status='RESOLVED' AND NEW.status IN ('OPEN','CLOSED')) THEN RETURN NEW; END IF; RAISE EXCEPTION 'invalid support case transition' USING ERRCODE='23514'; END $$;
CREATE TRIGGER support_status_valid BEFORE UPDATE OF status ON support_cases FOR EACH ROW EXECUTE FUNCTION support_validate_transition();
CREATE FUNCTION reject_support_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'support history is append-only' USING ERRCODE='55000'; END $$;
CREATE TRIGGER support_public_messages_append_only BEFORE UPDATE OR DELETE ON support_public_messages FOR EACH STATEMENT EXECUTE FUNCTION reject_support_history_mutation();
CREATE TRIGGER support_internal_notes_append_only BEFORE UPDATE OR DELETE ON support_internal_notes FOR EACH STATEMENT EXECUTE FUNCTION reject_support_history_mutation();
CREATE TRIGGER support_status_history_append_only BEFORE UPDATE OR DELETE ON support_status_history FOR EACH STATEMENT EXECUTE FUNCTION reject_support_history_mutation();
CREATE TRIGGER support_assignment_history_append_only BEFORE UPDATE OR DELETE ON support_assignment_history FOR EACH STATEMENT EXECUTE FUNCTION reject_support_history_mutation();
CREATE TRIGGER support_priority_history_append_only BEFORE UPDATE OR DELETE ON support_priority_history FOR EACH STATEMENT EXECUTE FUNCTION reject_support_history_mutation();

UPDATE users SET permissions=(SELECT array_agg(DISTINCT p ORDER BY p) FROM unnest(permissions||ARRAY['platform.merchants.read','platform.transactions.read','platform.refunds.read','platform.settlements.read','platform.reconciliation.read','platform.support.read','platform.support.reply','platform.support.assign','platform.support.manage','platform.audit.read','platform.health.read','platform.compliance.read','platform.compliance.review']) p) WHERE merchant_id IS NULL AND role='PLATFORM_ADMIN';
UPDATE merchant_roles SET permissions=(SELECT array_agg(DISTINCT p ORDER BY p) FROM unnest(permissions||ARRAY['support:read','support:write']) p) WHERE normalized_name IN ('owner','administrator','support');
