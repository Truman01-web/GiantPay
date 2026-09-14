ALTER TABLE users ADD COLUMN status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED','REMOVED'));
ALTER TABLE users ADD COLUMN normalized_email text;
UPDATE users SET normalized_email=lower(trim(email)) WHERE normalized_email IS NULL;
CREATE UNIQUE INDEX users_normalized_email_idx ON users(normalized_email);

CREATE TABLE merchant_roles (
 id text PRIMARY KEY, merchant_id text NOT NULL REFERENCES merchants(id), name text NOT NULL, normalized_name text NOT NULL,
 description text NOT NULL DEFAULT '', permissions text[] NOT NULL, system_role boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','ARCHIVED')), created_by text REFERENCES users(id), updated_by text REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(merchant_id,normalized_name), UNIQUE(merchant_id,id)
);
CREATE INDEX merchant_roles_scope_idx ON merchant_roles(merchant_id,status,name,id);
CREATE TABLE user_role_assignments (
 user_id text PRIMARY KEY REFERENCES users(id), merchant_id text NOT NULL REFERENCES merchants(id), role_id text NOT NULL,
 assigned_by text REFERENCES users(id), assigned_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(merchant_id,role_id) REFERENCES merchant_roles(merchant_id,id)
);
CREATE INDEX user_role_assignments_scope_idx ON user_role_assignments(merchant_id,role_id,user_id);

CREATE TABLE team_invitations (
 id text PRIMARY KEY, merchant_id text NOT NULL REFERENCES merchants(id), normalized_email text NOT NULL, role_id text NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','CANCELLED','EXPIRED')), invited_by text NOT NULL REFERENCES users(id),
 token_hash char(64) NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 accepted_at timestamptz, cancelled_at timestamptz, expired_at timestamptz, accepted_by text REFERENCES users(id),
 FOREIGN KEY(merchant_id,role_id) REFERENCES merchant_roles(merchant_id,id), UNIQUE(merchant_id,id)
);
CREATE UNIQUE INDEX team_invitations_active_email_idx ON team_invitations(merchant_id,normalized_email) WHERE status='PENDING';
CREATE INDEX team_invitations_scope_idx ON team_invitations(merchant_id,status,expires_at,id);

CREATE TABLE mfa_enrollments (
 user_id text PRIMARY KEY REFERENCES users(id), secret_ciphertext text NOT NULL, verified_at timestamptz, last_counter bigint,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION protect_verified_mfa_secret() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.verified_at IS NOT NULL AND OLD.secret_ciphertext IS DISTINCT FROM NEW.secret_ciphertext THEN RAISE EXCEPTION 'verified MFA secret is immutable' USING ERRCODE='55000'; END IF; RETURN NEW; END $$;
CREATE TRIGGER mfa_verified_secret_immutable BEFORE UPDATE ON mfa_enrollments FOR EACH ROW EXECUTE FUNCTION protect_verified_mfa_secret();
CREATE TABLE mfa_recovery_codes (id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),code_hash char(64) NOT NULL,used_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,code_hash));
CREATE INDEX mfa_recovery_codes_user_idx ON mfa_recovery_codes(user_id,used_at,id);
CREATE TABLE authentication_challenges (id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),purpose text NOT NULL CHECK(purpose IN ('LOGIN','MFA_ENROLLMENT','STEP_UP')),expires_at timestamptz NOT NULL,used_at timestamptz,attempt_count integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX authentication_challenges_user_idx ON authentication_challenges(user_id,purpose,expires_at,id);
CREATE TABLE password_reset_requests (id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),token_hash char(64) NOT NULL UNIQUE,expires_at timestamptz NOT NULL,used_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX password_reset_user_idx ON password_reset_requests(user_id,expires_at,id);

ALTER TABLE sessions ADD COLUMN public_id text;
ALTER TABLE sessions ADD COLUMN revoked_at timestamptz;
ALTER TABLE sessions ADD COLUMN mfa_verified_at timestamptz;
UPDATE sessions SET public_id='ses_'||substr(md5(token_hash),1,24) WHERE public_id IS NULL;
ALTER TABLE sessions ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN public_id SET DEFAULT ('ses_'||substr(md5(random()::text||clock_timestamp()::text),1,24));
CREATE UNIQUE INDEX sessions_public_id_idx ON sessions(public_id);

DO $$ DECLARE m record; role_id text; BEGIN FOR m IN SELECT id FROM merchants LOOP
 role_id:='role_'||substr(md5(m.id||':owner'),1,24);
 INSERT INTO merchant_roles(id,merchant_id,name,normalized_name,description,permissions,system_role)
 VALUES(role_id,m.id,'Owner','owner','Full merchant-level control',ARRAY['payments:read','payments.links:manage','payments.refunds:request','payments.refunds:approve','settlements:read','settlements:manage','settlements:approve','reconciliation:read','reconciliation:manage','reconciliation:approve','ledger:read','ledger:integrity','reports:read','reports:export','audit:read','developer.apiKeys:manage','developer.webhooks:manage','team:read','team:manage','roles:read','roles:manage','sessions:read','sessions:manage','security:manage:self'],true) ON CONFLICT DO NOTHING;
 INSERT INTO merchant_roles(id,merchant_id,name,normalized_name,description,permissions,system_role)
 SELECT 'role_'||substr(md5(m.id||':'||v.normalized_name),1,24),m.id,v.name,v.normalized_name,v.description,v.permissions,true FROM (VALUES
 ('Administrator','administrator','Team administration',ARRAY['team:read','team:manage','roles:read','sessions:read','security:manage:self']::text[]),
 ('Finance','finance','Financial operations',ARRAY['payments:read','payments.refunds:request','settlements:read','reconciliation:read','ledger:read','reports:read','reports:export','security:manage:self']::text[]),
 ('Developer','developer','Developer platform',ARRAY['payments:read','developer.apiKeys:manage','developer.webhooks:manage','security:manage:self']::text[]),
 ('Support','support','Merchant support',ARRAY['payments:read','team:read','support:read','security:manage:self']::text[]),
 ('Viewer','viewer','Read-only merchant access',ARRAY['payments:read','settlements:read','reconciliation:read','ledger:read','reports:read','security:manage:self']::text[])
 ) v(name,normalized_name,description,permissions) ON CONFLICT DO NOTHING;
 INSERT INTO user_role_assignments(user_id,merchant_id,role_id) SELECT id,m.id,role_id FROM users WHERE merchant_id=m.id AND role='OWNER' ON CONFLICT(user_id) DO NOTHING;
 END LOOP; END $$;

CREATE FUNCTION protect_last_owner() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE remaining integer; BEGIN
 IF TG_OP='DELETE' THEN SELECT count(*) INTO remaining FROM user_role_assignments a JOIN users u ON u.id=a.user_id JOIN merchant_roles r ON r.id=a.role_id WHERE a.merchant_id=OLD.merchant_id AND r.normalized_name='owner' AND u.status='ACTIVE' AND a.user_id<>OLD.user_id; IF remaining=0 THEN RAISE EXCEPTION 'final owner protected' USING ERRCODE='23514'; END IF; RETURN OLD; END IF; RETURN NEW; END $$;
CREATE TRIGGER final_owner_assignment_delete BEFORE DELETE ON user_role_assignments FOR EACH ROW EXECUTE FUNCTION protect_last_owner();

DROP TRIGGER final_owner_assignment_delete ON user_role_assignments;
DROP FUNCTION protect_last_owner();
CREATE FUNCTION assert_merchant_has_active_owner(target_merchant text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF target_merchant IS NULL THEN RETURN; END IF;
 PERFORM id FROM merchants WHERE id=target_merchant FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM users u JOIN user_role_assignments a ON a.user_id=u.id AND a.merchant_id=u.merchant_id JOIN merchant_roles r ON r.id=a.role_id AND r.merchant_id=a.merchant_id WHERE u.merchant_id=target_merchant AND u.status='ACTIVE' AND r.normalized_name='owner' AND r.status='ACTIVE') THEN
   RAISE EXCEPTION 'final owner protected' USING ERRCODE='23514';
 END IF;
END $$;
CREATE FUNCTION enforce_owner_after_user() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM assert_merchant_has_active_owner(OLD.merchant_id); RETURN NULL; END $$;
CREATE FUNCTION enforce_owner_after_assignment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM assert_merchant_has_active_owner(COALESCE(NEW.merchant_id,OLD.merchant_id)); RETURN NULL; END $$;
CREATE FUNCTION enforce_owner_after_role() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM assert_merchant_has_active_owner(OLD.merchant_id); RETURN NULL; END $$;
CREATE TRIGGER final_owner_user_status AFTER UPDATE OF status ON users FOR EACH ROW WHEN (OLD.merchant_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION enforce_owner_after_user();
CREATE TRIGGER final_owner_assignment AFTER UPDATE OR DELETE ON user_role_assignments FOR EACH ROW EXECUTE FUNCTION enforce_owner_after_assignment();
CREATE TRIGGER final_owner_role_status AFTER UPDATE OF status ON merchant_roles FOR EACH ROW WHEN (OLD.normalized_name='owner' AND OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION enforce_owner_after_role();
