ALTER TABLE merchant_webhook_endpoints
  DROP CONSTRAINT merchant_webhook_endpoints_event_types_check;

ALTER TABLE merchant_webhook_endpoints
  ADD CONSTRAINT merchant_webhook_endpoints_event_types_check
  CHECK (event_types <@ ARRAY[
    'payment.processing','payment.succeeded','payment.failed','payment.refunded',
    'refund.pending_approval','refund.approved','refund.rejected'
  ]::text[]);
