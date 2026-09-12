import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Db } from '../db.js';

// Only expose capabilities currently reachable with API-key authentication.
export const API_KEY_SCOPES = ['payments:read'] as const;

export function generateApiKey() {
  const publicId = randomBytes(9).toString('base64url');
  const secret = randomBytes(32).toString('base64url');
  const plaintext = `gp_test_${publicId}_${secret}`;
  return { publicId, plaintext, fingerprint: `gp_test_${publicId}_...${secret.slice(-4)}` };
}

export function apiKeyVerifier(key: string, pepper: string) {
  return createHmac('sha256', pepper).update(key).digest('hex');
}

export async function verifyApiKey(db: Db, plaintext: string, pepper: string) {
  const match = /^gp_test_([A-Za-z0-9_-]{12})_([A-Za-z0-9_-]{43})$/.exec(plaintext);
  if (!match) return null;
  const result = await db.query(`SELECT k.*,m.name merchant_name,m.environment FROM api_keys k JOIN merchants m ON m.id=k.merchant_id WHERE k.public_id=$1`, [match[1]]);
  const row = result.rows[0];
  const calculated = Buffer.from(apiKeyVerifier(plaintext, pepper), 'hex');
  const stored = Buffer.from(row?.verifier ?? '0'.repeat(64), 'hex');
  if (!row || stored.length !== calculated.length || !timingSafeEqual(stored, calculated) || row.revoked_at || (row.expires_at && new Date(row.expires_at) <= new Date())) return null;
  void db.query('UPDATE api_keys SET last_used_at=now() WHERE id=$1', [row.id]).catch(() => undefined);
  return row;
}
