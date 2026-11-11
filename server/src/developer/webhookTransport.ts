import { lookup as dnsLookup } from 'node:dns';
import type { LookupFunction } from 'node:net';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { forbiddenIp } from './webhookSecurity.js';

// Validate the actual socket lookup, not an earlier DNS answer. Do not share a
// connection pool that could skip this check, or let the client follow redirects.
export function publicWebhookLookup(resolve: typeof dnsLookup = dnsLookup): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) return callback(error, [], undefined);
      if (!addresses.length || addresses.some(({ address }) => forbiddenIp(address)))
        return callback(new Error('Webhook target address is forbidden.'), [], undefined);
      if (options.all) return callback(null, addresses, undefined);
      const address = addresses.find(item => !options.family || item.family === options.family);
      if (!address) return callback(new Error('No permitted address family.'), [], undefined);
      callback(null, address.address, address.family);
    });
  };
}

export function deliverWebhook(url: string, headers: Record<string, string>, body: Buffer, signal: AbortSignal, maxBytes: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = (target.protocol === 'https:' ? httpsRequest : httpRequest)(target, {
      method: 'POST', agent: false, lookup: publicWebhookLookup(), signal,
      headers: { ...headers, 'content-length': String(body.byteLength) },
    }, response => {
      let size = 0;
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => {
        size += chunk.byteLength;
        if (size > maxBytes) {
          response.destroy();
          reject(new Error('Webhook response exceeds the configured limit.'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('aborted', () => reject(new Error('Webhook response aborted.')));
      response.on('end', () => {
        const status = response.statusCode ?? 502;
        if (status < 200 || status > 599) {
          reject(new Error('Webhook response status is invalid.'));
          return;
        }
        resolve(new Response([204, 205, 304].includes(status) ? null : Buffer.concat(chunks).toString('utf8'), { status }));
      });
    });
    request.on('upgrade', (_response, socket) => {
      socket.destroy();
      reject(new Error('Webhook protocol upgrades are forbidden.'));
    });
    request.on('error', reject);
    request.end(body);
  });
}
