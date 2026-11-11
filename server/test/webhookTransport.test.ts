import { describe, expect, it, vi } from 'vitest';
import type { lookup } from 'node:dns';
import { publicWebhookLookup } from '../src/developer/webhookTransport.js';
import { deliverWebhook } from '../src/developer/webhookTransport.js';
import { request } from 'node:https';
import { EventEmitter } from 'node:events';

vi.mock('node:https', () => ({ request: vi.fn() }));

function resolveAtConnection(addresses: { address: string; family: number }[], all = false) {
  const resolver = vi.fn((_host, _options, callback) => callback(null, addresses)) as unknown as typeof lookup;
  return new Promise<{ error: Error | null; address: unknown }>(resolve => {
    publicWebhookLookup(resolver)('merchant.example', { all }, (error, address) => resolve({ error, address }));
  });
}

describe('webhook socket DNS boundary', () => {
  it.each(['127.0.0.1', '10.0.0.1', '169.254.169.254', '::1', '::ffff:127.0.0.1', 'fc00::1'])(
    'rejects a public hostname rebound to %s at connection time', async address => {
      expect((await resolveAtConnection([{ address, family: address.includes(':') ? 6 : 4 }])).error).toBeInstanceOf(Error);
    },
  );
  it('rejects mixed public and private DNS answers, including auto-family lookup', async () => {
    expect((await resolveAtConnection([{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }], true)).error).toBeInstanceOf(Error);
  });
  it('passes only the validated DNS answer to the socket', async () => {
    expect(await resolveAtConnection([{ address: '8.8.8.8', family: 4 }])).toEqual({ error: null, address: '8.8.8.8' });
    expect(await resolveAtConnection([{ address: '8.8.8.8', family: 4 }], true)).toEqual({ error: null, address: [{ address: '8.8.8.8', family: 4 }] });
  });
});

describe('webhook transport bounds', () => {
  function respond(status: number, chunks: Buffer[]) {
    const response = Object.assign(new EventEmitter(), { statusCode: status, destroy: vi.fn() });
    vi.mocked(request).mockImplementation(((_url: unknown, _options: unknown, callback: (response: unknown) => void) => {
      const client = Object.assign(new EventEmitter(), { end: () => {
        callback(response);
        for (const chunk of chunks) response.emit('data', chunk);
        response.emit('end');
      } });
      return client;
    }) as typeof request);
    return response;
  }
  it('keeps the hostname for TLS and uses guarded DNS without pooled sockets', async () => {
    respond(204, []);
    const signal = new AbortController().signal;
    const response = await deliverWebhook('https://merchant.example/hook', {}, Buffer.from('{}'), signal, 100);
    expect(response.status).toBe(204);
    expect(vi.mocked(request).mock.calls.at(-1)?.[0]).toEqual(new URL('https://merchant.example/hook'));
    expect(vi.mocked(request).mock.calls.at(-1)?.[1]).toMatchObject({ agent: false, lookup: expect.any(Function), signal });
  });
  it('rejects and closes oversized responses before buffering them', async () => {
    const response = respond(200, [Buffer.alloc(101)]);
    await expect(deliverWebhook('https://merchant.example/hook', {}, Buffer.from('{}'), new AbortController().signal, 100)).rejects.toThrow(/limit/);
    expect(response.destroy).toHaveBeenCalled();
  });
  it('rejects an untrusted invalid HTTP status without throwing outside the promise', async () => {
    respond(700, []);
    await expect(deliverWebhook('https://merchant.example/hook', {}, Buffer.from('{}'), new AbortController().signal, 100)).rejects.toThrow(/status is invalid/);
  });
  it('returns redirects for worker rejection without following their targets', async () => {
    respond(302, []);
    vi.mocked(request).mockClear();
    expect((await deliverWebhook('https://merchant.example/hook', {}, Buffer.from('{}'), new AbortController().signal, 100)).status).toBe(302);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
