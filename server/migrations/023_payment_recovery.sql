-- Durable recovery scheduling; never changes payment status or releases capacity.
ALTER TABLE payments
 ADD COLUMN IF NOT EXISTS recovery_attempts integer NOT NULL DEFAULT 0 CHECK (recovery_attempts >= 0),
 ADD COLUMN IF NOT EXISTS recovery_next_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN IF NOT EXISTS recovery_lease_until timestamptz,
 ADD COLUMN IF NOT EXISTS recovery_lease_token text,
 ADD COLUMN IF NOT EXISTS recovery_escalated_at timestamptz,
 ADD COLUMN IF NOT EXISTS recovery_outcome text;
CREATE INDEX IF NOT EXISTS payments_recovery_due ON payments(recovery_next_at)
 WHERE provider_name='flutterwave' AND status IN ('PROCESSING','PENDING') AND recovery_escalated_at IS NULL;
