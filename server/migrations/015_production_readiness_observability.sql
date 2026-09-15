CREATE TABLE operational_incidents(
 id text PRIMARY KEY,reference text NOT NULL UNIQUE,title text NOT NULL CHECK(length(trim(title)) BETWEEN 3 AND 160),summary text NOT NULL CHECK(length(trim(summary)) BETWEEN 3 AND 2000),
 severity text NOT NULL CHECK(severity IN ('SEV1','SEV2','SEV3','SEV4')),state text NOT NULL DEFAULT 'DECLARED' CHECK(state IN ('DECLARED','INVESTIGATING','IDENTIFIED','MONITORING','RESOLVED','CLOSED')),
 impact_scope text NOT NULL CHECK(impact_scope IN ('PLATFORM','MERCHANTS','PAYMENTS','REFUNDS','SETTLEMENTS','RECONCILIATION','WEBHOOKS','NOTIFICATIONS','AUTHENTICATION','DATABASE','CACHE','OTHER')),
 declared_by text NOT NULL REFERENCES users(id),incident_commander text REFERENCES users(id),version integer NOT NULL DEFAULT 1 CHECK(version>0),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz,closed_at timestamptz
);
CREATE INDEX operational_incidents_page_idx ON operational_incidents(created_at DESC,id DESC);
CREATE INDEX operational_incidents_active_idx ON operational_incidents(state,severity) WHERE state NOT IN ('RESOLVED','CLOSED');
CREATE TABLE operational_incident_history(id text PRIMARY KEY,incident_id text NOT NULL REFERENCES operational_incidents(id),actor_id text NOT NULL REFERENCES users(id),from_state text,to_state text NOT NULL,reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 1000),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE operational_incident_notes(id text PRIMARY KEY,incident_id text NOT NULL REFERENCES operational_incidents(id),actor_id text NOT NULL REFERENCES users(id),body text NOT NULL CHECK(length(trim(body)) BETWEEN 3 AND 4000),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE operational_control_requests(
 id text PRIMARY KEY,control_key text NOT NULL CHECK(control_key IN ('PAYMENT_CREATION_PAUSED','REFUND_MUTATIONS_PAUSED','SETTLEMENT_PROCESSING_PAUSED','WEBHOOK_DELIVERY_PAUSED','NOTIFICATION_PROCESSING_PAUSED','OUTBOX_PROCESSING_PAUSED','DISPUTE_MUTATIONS_PAUSED','ONBOARDING_SUBMISSIONS_PAUSED')),
 requested_active boolean NOT NULL,expected_active boolean NOT NULL,reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 1000),expires_at timestamptz,proposed_by text NOT NULL REFERENCES users(id),status text NOT NULL DEFAULT 'PROPOSED' CHECK(status IN ('PROPOSED','APPROVED','REJECTED')),created_at timestamptz NOT NULL DEFAULT now(),decided_at timestamptz,
 CHECK(expires_at IS NULL OR expires_at>created_at)
);
CREATE INDEX operational_control_requests_key_idx ON operational_control_requests(control_key,created_at DESC,id DESC);
CREATE UNIQUE INDEX operational_control_one_proposal_idx ON operational_control_requests(control_key) WHERE status='PROPOSED';
CREATE TABLE operational_control_decisions(id text PRIMARY KEY,request_id text NOT NULL UNIQUE REFERENCES operational_control_requests(id),decision text NOT NULL CHECK(decision IN ('APPROVED','REJECTED')),decided_by text NOT NULL REFERENCES users(id),reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 1000),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE operational_control_history(id text PRIMARY KEY,request_id text NOT NULL REFERENCES operational_control_requests(id),control_key text NOT NULL,active boolean NOT NULL,actor_id text NOT NULL REFERENCES users(id),reason text NOT NULL,expires_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX operational_control_history_effective_idx ON operational_control_history(control_key,created_at DESC,id DESC);
CREATE TABLE operational_idempotency(authority_scope text NOT NULL,actor_id text NOT NULL,operation text NOT NULL,resource_id text NOT NULL DEFAULT '',idempotency_key text NOT NULL,request_sha256 char(64) NOT NULL,response_status integer NOT NULL,response_body jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(authority_scope,actor_id,operation,resource_id,idempotency_key));

CREATE FUNCTION operational_incident_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF (OLD.id,OLD.reference,OLD.declared_by,OLD.created_at) IS DISTINCT FROM (NEW.id,NEW.reference,NEW.declared_by,NEW.created_at) THEN RAISE EXCEPTION 'incident ownership is immutable' USING ERRCODE='55000'; END IF; RETURN NEW; END $$;
CREATE TRIGGER operational_incident_immutable BEFORE UPDATE ON operational_incidents FOR EACH ROW EXECUTE FUNCTION operational_incident_immutable();
CREATE FUNCTION operational_incident_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state=OLD.state THEN RETURN NEW; END IF; IF (OLD.state='DECLARED' AND NEW.state='INVESTIGATING') OR (OLD.state='INVESTIGATING' AND NEW.state IN ('IDENTIFIED','MONITORING')) OR (OLD.state='IDENTIFIED' AND NEW.state='MONITORING') OR (OLD.state='MONITORING' AND NEW.state IN ('INVESTIGATING','RESOLVED')) OR (OLD.state='RESOLVED' AND NEW.state IN ('MONITORING','CLOSED')) THEN RETURN NEW; END IF; RAISE EXCEPTION 'invalid incident transition' USING ERRCODE='23514'; END $$;
CREATE TRIGGER operational_incident_transition BEFORE UPDATE OF state ON operational_incidents FOR EACH ROW EXECUTE FUNCTION operational_incident_transition();
CREATE FUNCTION operational_history_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'operational history is append-only' USING ERRCODE='55000'; END $$;
CREATE TRIGGER operational_incident_history_append_only BEFORE UPDATE OR DELETE ON operational_incident_history FOR EACH STATEMENT EXECUTE FUNCTION operational_history_append_only();
CREATE TRIGGER operational_incident_notes_append_only BEFORE UPDATE OR DELETE ON operational_incident_notes FOR EACH STATEMENT EXECUTE FUNCTION operational_history_append_only();
CREATE TRIGGER operational_control_decisions_append_only BEFORE UPDATE OR DELETE ON operational_control_decisions FOR EACH STATEMENT EXECUTE FUNCTION operational_history_append_only();
CREATE TRIGGER operational_control_history_append_only BEFORE UPDATE OR DELETE ON operational_control_history FOR EACH STATEMENT EXECUTE FUNCTION operational_history_append_only();
CREATE FUNCTION operational_checker_separation() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE maker text; BEGIN SELECT proposed_by INTO maker FROM operational_control_requests WHERE id=NEW.request_id; IF maker=NEW.decided_by THEN RAISE EXCEPTION 'independent operational checker required' USING ERRCODE='23514'; END IF; RETURN NEW; END $$;
CREATE TRIGGER operational_checker_separation BEFORE INSERT ON operational_control_decisions FOR EACH ROW EXECUTE FUNCTION operational_checker_separation();

UPDATE users SET permissions=(SELECT array_agg(DISTINCT p ORDER BY p) FROM unnest(permissions||ARRAY['platform.operations.read','platform.incidents.read','platform.incidents.manage','platform.controls.read','platform.controls.propose','platform.controls.approve','platform.metrics.read']) p) WHERE merchant_id IS NULL AND role='PLATFORM_ADMIN';
