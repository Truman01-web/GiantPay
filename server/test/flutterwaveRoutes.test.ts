import Fastify from 'fastify';
import { describe, it, expect, vi } from 'vitest';
import { registerFlutterwaveRoutes } from '../src/payments/flutterwaveRoutes.js';
import { FlutterwavePaymentProvider } from '../src/providers/flutterwaveProvider.js';
import type { Config } from '../src/config.js';
import type { Db } from '../src/db.js';
import type { RateLimitStore } from '../src/rateLimit.js';
import { processPaymentWebhook } from '../src/payments/webhookProcessor.js';

vi.mock('../src/payments/webhookProcessor.js', () => ({ processPaymentWebhook: vi.fn().mockResolvedValue({ outcome: 'PROCESSED' }) }));
vi.mock('../src/operations/controls.js', () => ({ operationalControlGuard: () => async () => {} }));
vi.mock('../src/rateLimit.js', () => ({ rateLimit: () => async () => {} }));

describe('Flutterwave webhook authoritative verification', () => {
  it.each(['timeout', 'pending', 'wrong-amount', 'success'])('handles %s without trusting the notification', async (outcome) => {
    vi.mocked(processPaymentWebhook).mockClear();
    const verifyTransaction = vi.fn(async () => {
      if (outcome === 'timeout') throw new Error('timeout');
      return { status: 'success', message: '', data: { id: 123, tx_ref: 'GP-test', flw_ref: 'flw', status: outcome === 'pending' ? 'pending' : 'successful', currency: 'MWK', amount: outcome === 'wrong-amount' ? 9 : 10 } };
    });
    const provider = new FlutterwavePaymentProvider('test', 'test', 'hash', 'http://localhost', { initiateCheckout: vi.fn(), verifyTransaction } as any);
    const db = { query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [{ reference: 'GP-test', gross_minor: 1000, currency: 'MWK', provider_name: 'flutterwave' }] }) } as unknown as Db;
    const app = Fastify();
    app.addHook('preHandler', async (r) => { (r as any).rawWebhookBody = Buffer.from(JSON.stringify(r.body)); });
    await registerFlutterwaveRoutes(app, { FRONTEND_ORIGIN: 'http://localhost' } as Config, db, {} as RateLimitStore, provider);
    try {
      const res = await app.inject({ method: 'POST', url: '/v1/webhooks/providers/flutterwave', headers: { 'verif-hash': 'hash' }, payload: { event: 'charge.completed', data: { id: 123, tx_ref: 'GP-test', flw_ref: 'flw', status: 'successful', currency: 'MWK', amount: 10, charged_amount: 10, customer: { phone_number: null } } } });
      expect(res.statusCode).toBe(outcome === 'success' ? 202 : outcome === 'wrong-amount' ? 409 : 503);
      expect(processPaymentWebhook).toHaveBeenCalledTimes(outcome === 'success' ? 1 : 0);
    } finally { await app.close(); }
  });
});
