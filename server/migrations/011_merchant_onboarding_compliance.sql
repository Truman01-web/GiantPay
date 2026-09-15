CREATE TABLE onboarding_applications (
 id text PRIMARY KEY, merchant_id text NOT NULL UNIQUE REFERENCES merchants(id),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','INFORMATION_REQUIRED','RESUBMITTED','APPROVED','REJECTED','SUSPENDED')),
 questionnaire_version text NOT NULL DEFAULT '2026-01', draft_revision integer NOT NULL DEFAULT 1 CHECK(draft_revision>0),
 submitted_snapshot jsonb, submitted_by text REFERENCES users(id), submitted_at timestamptz,
 reviewer_id text REFERENCES users(id), approved_by text REFERENCES users(id),
 created_by text NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status='DRAFT' OR submitted_snapshot IS NOT NULL), CHECK(approved_by IS NULL OR approved_by IS DISTINCT FROM reviewer_id)
);
CREATE INDEX onboarding_applications_review_idx ON onboarding_applications(status,submitted_at,id);

CREATE TABLE onboarding_business_profiles (
 application_id text PRIMARY KEY REFERENCES onboarding_applications(id) ON DELETE CASCADE,
 merchant_id text NOT NULL REFERENCES merchants(id), legal_name text NOT NULL, trading_name text,
 registration_number_ciphertext text, registration_number_masked text, tax_identifier_ciphertext text, tax_identifier_masked text,
 business_type text NOT NULL, industry text NOT NULL, incorporation_country char(2) NOT NULL, operating_country char(2) NOT NULL,
 contact_email text NOT NULL, contact_phone text NOT NULL, website text,
 expected_monthly_volume_min integer NOT NULL CHECK(expected_monthly_volume_min>=0), expected_monthly_volume_max integer NOT NULL CHECK(expected_monthly_volume_max>=expected_monthly_volume_min),
 expected_monthly_value_min bigint NOT NULL CHECK(expected_monthly_value_min>=0), expected_monthly_value_max bigint NOT NULL CHECK(expected_monthly_value_max>=expected_monthly_value_min),
 intended_channels text[] NOT NULL, settlement_account_ciphertext text, settlement_account_masked text,
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(merchant_id,application_id)
);
CREATE TABLE onboarding_addresses (
 id text PRIMARY KEY, application_id text NOT NULL REFERENCES onboarding_applications(id) ON DELETE CASCADE, merchant_id text NOT NULL REFERENCES merchants(id),
 kind text NOT NULL CHECK(kind IN ('REGISTERED','OPERATING')), line1 text NOT NULL, line2 text, city text NOT NULL, region text, postal_code text, country char(2) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(application_id,kind), UNIQUE(merchant_id,id)
);
CREATE TABLE onboarding_directors (
 id text PRIMARY KEY, application_id text NOT NULL REFERENCES onboarding_applications(id) ON DELETE CASCADE, merchant_id text NOT NULL REFERENCES merchants(id),
 full_name text NOT NULL, email text, nationality char(2) NOT NULL, identification_ciphertext text, identification_masked text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(merchant_id,id)
);
CREATE TABLE onboarding_beneficial_owners (
 id text PRIMARY KEY, application_id text NOT NULL REFERENCES onboarding_applications(id) ON DELETE CASCADE, merchant_id text NOT NULL REFERENCES merchants(id),
 full_name text NOT NULL, email text, nationality char(2) NOT NULL, ownership_basis_points integer NOT NULL CHECK(ownership_basis_points BETWEEN 1 AND 10000),
 identification_ciphertext text, identification_masked text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(merchant_id,id)
);
CREATE TABLE onboarding_authorized_representatives (
 id text PRIMARY KEY, application_id text NOT NULL REFERENCES onboarding_applications(id) ON DELETE CASCADE, merchant_id text NOT NULL REFERENCES merchants(id),
 full_name text NOT NULL, email text NOT NULL, telephone text NOT NULL, authority text NOT NULL,
 identification_ciphertext text, identification_masked text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(merchant_id,id)
);
CREATE TABLE onboarding_questionnaires (
 application_id text PRIMARY KEY REFERENCES onboarding_applications(id) ON DELETE CASCADE, merchant_id text NOT NULL REFERENCES merchants(id),
 version text NOT NULL, answers jsonb NOT NULL CHECK(jsonb_typeof(answers)='object'), declaration_accepted boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(merchant_id,application_id)
);
CREATE TABLE onboarding_evidence (
 id text PRIMARY KEY, application_id text NOT NULL REFERENCES onboarding_applications(id) ON DELETE CASCADE, merchant_id text NOT NULL REFERENCES merchants(id),
 category text NOT NULL CHECK(category IN ('BUSINESS_REGISTRATION','TAX_REGISTRATION','DIRECTOR_IDENTIFICATION','BENEFICIAL_OWNER_IDENTIFICATION','ADDRESS','BANK_ACCOUNT','ADDITIONAL_COMPLIANCE')),
 owner_type text NOT NULL CHECK(owner_type IN ('MERCHANT','DIRECTOR','BENEFICIAL_OWNER','REPRESENTATIVE')), owner_id text,
 storage_reference_ciphertext text NOT NULL, storage_reference_masked text NOT NULL, media_type text NOT NULL CHECK(media_type IN ('application/pdf','image/jpeg','image/png')),
 size_bytes bigint NOT NULL CHECK(size_bytes BETWEEN 1 AND 10485760), sha256 char(64) NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 file_name text NOT NULL, created_by text NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), removed_at timestamptz,
 UNIQUE(application_id,sha256), UNIQUE(merchant_id,id)
);
CREATE INDEX onboarding_evidence_scope_idx ON onboarding_evidence(merchant_id,application_id,category,id);
CREATE TABLE onboarding_information_requests (
 id text PRIMARY KEY, application_id text NOT NULL REFERENCES onboarding_applications(id), merchant_id text NOT NULL REFERENCES merchants(id),
 reason text NOT NULL CHECK(length(trim(reason))>=10), evidence_reference text NOT NULL CHECK(length(trim(evidence_reference))>=3),
 requested_by text NOT NULL REFERENCES users(id), response text, responded_by text REFERENCES users(id), requested_at timestamptz NOT NULL DEFAULT now(), responded_at timestamptz,
 UNIQUE(merchant_id,id)
);
CREATE TABLE onboarding_risk_classifications (
 id text PRIMARY KEY, application_id text NOT NULL REFERENCES onboarding_applications(id), merchant_id text NOT NULL REFERENCES merchants(id),
 classification text NOT NULL CHECK(classification IN ('LOW','MEDIUM','HIGH','PROHIBITED')), rationale text NOT NULL CHECK(length(trim(rationale))>=10),
 evidence_reference text NOT NULL CHECK(length(trim(evidence_reference))>=3), recorded_by text NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(merchant_id,id)
);
CREATE TABLE onboarding_review_decisions (
 id text PRIMARY KEY, application_id text NOT NULL REFERENCES onboarding_applications(id), merchant_id text NOT NULL REFERENCES merchants(id),
 decision text NOT NULL CHECK(decision IN ('APPROVED','REJECTED','SUSPENDED')), reason text NOT NULL CHECK(length(trim(reason))>=10),
 evidence_reference text NOT NULL CHECK(length(trim(evidence_reference))>=3), decided_by text NOT NULL REFERENCES users(id), decided_at timestamptz NOT NULL DEFAULT now(), UNIQUE(merchant_id,id)
);
CREATE TABLE onboarding_status_transitions (
 id text PRIMARY KEY, application_id text NOT NULL REFERENCES onboarding_applications(id), merchant_id text NOT NULL REFERENCES merchants(id),
 from_status text, to_status text NOT NULL, actor_id text REFERENCES users(id), reason text, evidence_reference text, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX onboarding_transitions_idx ON onboarding_status_transitions(application_id,occurred_at,id);
CREATE TABLE onboarding_idempotency (
 merchant_id text NOT NULL REFERENCES merchants(id), operation text NOT NULL, idempotency_key text NOT NULL, request_sha256 char(64) NOT NULL,
 response_status integer NOT NULL, response_body jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(merchant_id,operation,idempotency_key)
);

CREATE FUNCTION onboarding_assert_merchant() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE actual text; BEGIN
 SELECT merchant_id INTO actual FROM onboarding_applications WHERE id=NEW.application_id;
 IF actual IS NULL OR actual<>NEW.merchant_id THEN RAISE EXCEPTION 'onboarding merchant mismatch' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER onboarding_profile_merchant BEFORE INSERT OR UPDATE ON onboarding_business_profiles FOR EACH ROW EXECUTE FUNCTION onboarding_assert_merchant();
CREATE TRIGGER onboarding_address_merchant BEFORE INSERT OR UPDATE ON onboarding_addresses FOR EACH ROW EXECUTE FUNCTION onboarding_assert_merchant();
CREATE TRIGGER onboarding_director_merchant BEFORE INSERT OR UPDATE ON onboarding_directors FOR EACH ROW EXECUTE FUNCTION onboarding_assert_merchant();
CREATE TRIGGER onboarding_owner_merchant BEFORE INSERT OR UPDATE ON onboarding_beneficial_owners FOR EACH ROW EXECUTE FUNCTION onboarding_assert_merchant();
CREATE TRIGGER onboarding_rep_merchant BEFORE INSERT OR UPDATE ON onboarding_authorized_representatives FOR EACH ROW EXECUTE FUNCTION onboarding_assert_merchant();
CREATE TRIGGER onboarding_questionnaire_merchant BEFORE INSERT OR UPDATE ON onboarding_questionnaires FOR EACH ROW EXECUTE FUNCTION onboarding_assert_merchant();
CREATE TRIGGER onboarding_evidence_merchant BEFORE INSERT OR UPDATE ON onboarding_evidence FOR EACH ROW EXECUTE FUNCTION onboarding_assert_merchant();
CREATE TRIGGER onboarding_request_merchant BEFORE INSERT OR UPDATE ON onboarding_information_requests FOR EACH ROW EXECUTE FUNCTION onboarding_assert_merchant();
CREATE TRIGGER onboarding_risk_merchant BEFORE INSERT OR UPDATE ON onboarding_risk_classifications FOR EACH ROW EXECUTE FUNCTION onboarding_assert_merchant();
CREATE TRIGGER onboarding_decision_merchant BEFORE INSERT OR UPDATE ON onboarding_review_decisions FOR EACH ROW EXECUTE FUNCTION onboarding_assert_merchant();
CREATE TRIGGER onboarding_transition_merchant BEFORE INSERT OR UPDATE ON onboarding_status_transitions FOR EACH ROW EXECUTE FUNCTION onboarding_assert_merchant();

CREATE FUNCTION onboarding_validate_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.status=NEW.status THEN RETURN NEW; END IF;
 IF NOT ((OLD.status='DRAFT' AND NEW.status='SUBMITTED') OR (OLD.status='SUBMITTED' AND NEW.status='UNDER_REVIEW') OR
 (OLD.status='UNDER_REVIEW' AND NEW.status IN ('INFORMATION_REQUIRED','APPROVED','REJECTED')) OR
 (OLD.status='INFORMATION_REQUIRED' AND NEW.status='RESUBMITTED') OR (OLD.status='RESUBMITTED' AND NEW.status='UNDER_REVIEW') OR
 (OLD.status='APPROVED' AND NEW.status='SUSPENDED')) THEN RAISE EXCEPTION 'invalid onboarding state transition' USING ERRCODE='23514'; END IF;
 IF NEW.status IN ('APPROVED','SUSPENDED') AND NOT EXISTS(SELECT 1 FROM merchants WHERE id=NEW.merchant_id AND environment='sandbox') THEN RAISE EXCEPTION 'onboarding approval is sandbox only' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER onboarding_state_transition BEFORE UPDATE OF status ON onboarding_applications FOR EACH ROW EXECUTE FUNCTION onboarding_validate_transition();

CREATE FUNCTION onboarding_record_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 INSERT INTO onboarding_status_transitions(id,application_id,merchant_id,from_status,to_status,actor_id,reason,evidence_reference)
 VALUES('trn_'||replace(gen_random_uuid()::text,'-',''),NEW.id,NEW.merchant_id,OLD.status,NEW.status,nullif(current_setting('giantpay.actor_id',true),''),nullif(current_setting('giantpay.transition_reason',true),''),nullif(current_setting('giantpay.evidence_reference',true),''));
 RETURN NEW;
END $$;
CREATE TRIGGER onboarding_transition_evidence AFTER UPDATE OF status ON onboarding_applications FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION onboarding_record_transition();

CREATE FUNCTION onboarding_protect_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.submitted_snapshot IS DISTINCT FROM NEW.submitted_snapshot AND OLD.status NOT IN ('DRAFT','INFORMATION_REQUIRED') THEN RAISE EXCEPTION 'submitted onboarding snapshot is immutable' USING ERRCODE='55000'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER onboarding_snapshot_immutable BEFORE UPDATE OF submitted_snapshot ON onboarding_applications FOR EACH ROW EXECUTE FUNCTION onboarding_protect_snapshot();

CREATE FUNCTION onboarding_protect_submitted() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE state text; BEGIN
 SELECT status INTO state FROM onboarding_applications WHERE id=COALESCE(NEW.application_id,OLD.application_id);
 IF state NOT IN ('DRAFT','INFORMATION_REQUIRED') THEN RAISE EXCEPTION 'submitted onboarding evidence is immutable' USING ERRCODE='55000'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER onboarding_profile_immutable BEFORE UPDATE OR DELETE ON onboarding_business_profiles FOR EACH ROW EXECUTE FUNCTION onboarding_protect_submitted();
CREATE TRIGGER onboarding_address_immutable BEFORE UPDATE OR DELETE ON onboarding_addresses FOR EACH ROW EXECUTE FUNCTION onboarding_protect_submitted();
CREATE TRIGGER onboarding_director_immutable BEFORE UPDATE OR DELETE ON onboarding_directors FOR EACH ROW EXECUTE FUNCTION onboarding_protect_submitted();
CREATE TRIGGER onboarding_owner_immutable BEFORE UPDATE OR DELETE ON onboarding_beneficial_owners FOR EACH ROW EXECUTE FUNCTION onboarding_protect_submitted();
CREATE TRIGGER onboarding_rep_immutable BEFORE UPDATE OR DELETE ON onboarding_authorized_representatives FOR EACH ROW EXECUTE FUNCTION onboarding_protect_submitted();
CREATE TRIGGER onboarding_questionnaire_immutable BEFORE UPDATE OR DELETE ON onboarding_questionnaires FOR EACH ROW EXECUTE FUNCTION onboarding_protect_submitted();
CREATE TRIGGER onboarding_evidence_immutable BEFORE UPDATE OR DELETE ON onboarding_evidence FOR EACH ROW EXECUTE FUNCTION onboarding_protect_submitted();

CREATE FUNCTION onboarding_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'onboarding history is append-only' USING ERRCODE='55000'; END $$;
CREATE TRIGGER onboarding_transitions_append_only BEFORE UPDATE OR DELETE ON onboarding_status_transitions FOR EACH STATEMENT EXECUTE FUNCTION onboarding_append_only();
CREATE TRIGGER onboarding_decisions_append_only BEFORE UPDATE OR DELETE ON onboarding_review_decisions FOR EACH STATEMENT EXECUTE FUNCTION onboarding_append_only();
CREATE TRIGGER onboarding_risk_append_only BEFORE UPDATE OR DELETE ON onboarding_risk_classifications FOR EACH STATEMENT EXECUTE FUNCTION onboarding_append_only();

UPDATE merchant_roles SET permissions=(SELECT array_agg(DISTINCT p ORDER BY p) FROM unnest(permissions||ARRAY['onboarding:read','onboarding:write','onboarding:submit']) p)
 WHERE normalized_name='owner';
UPDATE merchant_roles SET permissions=(SELECT array_agg(DISTINCT p ORDER BY p) FROM unnest(permissions||ARRAY['onboarding:read','onboarding:write','onboarding:submit']) p)
 WHERE normalized_name='administrator';
UPDATE users SET permissions=(SELECT array_agg(DISTINCT p ORDER BY p) FROM unnest(permissions||ARRAY['compliance:read','compliance:review','compliance:approve']) p)
 WHERE merchant_id IS NULL AND role='PLATFORM_ADMIN';
