// For the disposable browserAcceptanceServer fixture only; never targets a hosted service.
import { createHash, createHmac, randomUUID } from 'node:crypto';

const [reference, status] = process.argv.slice(2);
if (!/^GP_[a-f0-9]{32}$/.test(reference ?? '') || !['SUCCEEDED', 'FAILED'].includes(status)) {
  console.error('Usage: node scripts/local-sandbox-callback.mjs GP_<reference> SUCCEEDED|FAILED');
  process.exit(1);
}
const timestamp = String(Math.floor(Date.now() / 1000));
const body = JSON.stringify({
  eventId: randomUUID(), eventType: 'payment.status.changed', paymentReference: reference,
  providerPaymentId: `sbx_${createHash('sha256').update(reference).digest('hex').slice(0, 24)}`,
  status, occurredAt: new Date().toISOString(),
});
const signature = createHmac('sha256', 's'.repeat(32)).update(`${timestamp}.${body}`).digest('hex');
const response = await fetch('http://127.0.0.1:4018/v1/webhooks/providers/sandbox', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-giantpay-timestamp': timestamp, 'x-giantpay-signature': signature }, body,
});
console.log(`Sandbox callback: HTTP ${response.status}`);
if (!response.ok) process.exitCode = 1;
