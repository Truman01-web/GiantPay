ALTER TABLE authentication_challenges
  ADD COLUMN email_otp_hmac text,
  ADD CONSTRAINT authentication_challenges_email_otp_hmac_check
    CHECK (email_otp_hmac IS NULL OR email_otp_hmac ~ '^[0-9a-f]{64}$');
