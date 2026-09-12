-- Immutable double-entry ledger and transactional outbox.
CREATE TABLE ledger_accounts (
  id text PRIMARY KEY,
  owner_type text NOT NULL CHECK (owner_type IN ('PLATFORM','MERCHANT')),
  merchant_id text REFERENCES merchants(id),
  code text NOT NULL CHECK (code IN ('PROVIDER_CLEARING','MERCHANT_PAYABLE','PLATFORM_FEE_REVENUE','TAX_PAYABLE','REFUND_CLEARING','SUSPENSE')),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((owner_type='MERCHANT' AND merchant_id IS NOT NULL) OR (owner_type='PLATFORM' AND merchant_id IS NULL)),
  UNIQUE NULLS NOT DISTINCT (owner_type,merchant_id,code,currency)
);

CREATE TABLE journal_entries (
  id text PRIMARY KEY,
  merchant_id text NOT NULL REFERENCES merchants(id),
  source_type text NOT NULL,
  source_id text NOT NULL,
  source_event_id text NOT NULL,
  description text NOT NULL,
  reversed_entry_id text REFERENCES journal_entries(id),
  reversal_reason text,
  actor_id text REFERENCES users(id),
  posted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_type,source_id,source_event_id),
  UNIQUE(reversed_entry_id),
  CHECK ((reversed_entry_id IS NULL AND reversal_reason IS NULL) OR (reversed_entry_id IS NOT NULL AND length(trim(reversal_reason)) >= 3))
);

CREATE INDEX journal_entries_merchant_posted_idx ON journal_entries(merchant_id,posted_at DESC,id DESC);

CREATE TABLE journal_postings (
  id text PRIMARY KEY,
  entry_id text NOT NULL REFERENCES journal_entries(id),
  account_id text NOT NULL REFERENCES ledger_accounts(id),
  direction text NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX journal_postings_entry_idx ON journal_postings(entry_id);
CREATE INDEX journal_postings_account_idx ON journal_postings(account_id,created_at DESC);

CREATE FUNCTION validate_journal_posting() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account_currency char(3); account_owner text; account_merchant_id text; entry_merchant_id text;
BEGIN
  SELECT currency,owner_type,merchant_id INTO account_currency,account_owner,account_merchant_id
    FROM ledger_accounts WHERE id=NEW.account_id;
  SELECT merchant_id INTO entry_merchant_id FROM journal_entries WHERE id=NEW.entry_id;
  IF account_currency <> NEW.currency THEN
    RAISE EXCEPTION 'posting currency does not match account currency' USING ERRCODE='23514';
  END IF;
  IF account_owner='MERCHANT' AND account_merchant_id <> entry_merchant_id THEN
    RAISE EXCEPTION 'merchant account does not belong to journal merchant' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER journal_postings_scope_valid
  BEFORE INSERT ON journal_postings FOR EACH ROW EXECUTE FUNCTION validate_journal_posting();

CREATE FUNCTION reject_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'posted ledger records are immutable' USING ERRCODE='55000'; END $$;
CREATE TRIGGER journal_entries_immutable BEFORE UPDATE OR DELETE ON journal_entries FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();
CREATE TRIGGER journal_postings_immutable BEFORE UPDATE OR DELETE ON journal_postings FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();

CREATE FUNCTION assert_journal_balance(target_id text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE currency_count integer; posting_count integer; imbalance_count integer;
BEGIN
  SELECT coalesce(sum(posting_total),0),count(*),count(*) FILTER (WHERE balance <> 0)
    INTO posting_count,currency_count,imbalance_count
    FROM (SELECT currency,count(*) posting_total,
                 sum(CASE direction WHEN 'DEBIT' THEN amount_minor ELSE -amount_minor END) balance
          FROM journal_postings WHERE entry_id=target_id GROUP BY currency) totals;
  IF posting_count < 2 OR currency_count < 1 OR imbalance_count > 0 THEN
    RAISE EXCEPTION 'journal entry % is unbalanced',target_id USING ERRCODE='23514';
  END IF;
END $$;

CREATE FUNCTION enforce_posting_balance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN PERFORM assert_journal_balance(OLD.entry_id);
  ELSE PERFORM assert_journal_balance(NEW.entry_id); END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER journal_postings_balanced
  AFTER INSERT OR UPDATE OR DELETE ON journal_postings DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_posting_balance();

CREATE FUNCTION enforce_entry_balance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM assert_journal_balance(NEW.id); RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER journal_entry_balanced
  AFTER INSERT ON journal_entries DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_entry_balance();

CREATE TABLE outbox_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','PUBLISHED','FAILED')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  last_error text,
  deduplication_key text NOT NULL UNIQUE
);
CREATE INDEX outbox_events_claim_idx ON outbox_events(status,available_at,created_at);

CREATE TRIGGER outbox_published_immutable BEFORE UPDATE OR DELETE ON outbox_events
FOR EACH ROW WHEN (OLD.status='PUBLISHED') EXECUTE FUNCTION reject_ledger_mutation();
