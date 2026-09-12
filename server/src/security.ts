import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from './db.js';
import { verifyApiKey } from './developer/apiKeys.js';

export const SESSION_COOKIE = 'giantpay_session';
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const newId = (prefix: string) => `${prefix}_${randomUUID().replaceAll('-', '')}`;
export const newToken = () => randomBytes(32).toString('base64url');

export interface Actor {
  id: string; merchantId: string | null; name: string; email: string; role: string;
  permissions: string[]; mfaEnabled: boolean; merchantName: string | null; environment: 'sandbox' | 'production';
  authType?: 'session' | 'apiKey'; apiKeyId?: string;
}

declare module 'fastify' {
  interface FastifyRequest { actor: Actor | null }
}

export async function authenticate(db: Db, request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) return reply.code(401).send(apiError(request, 'UNAUTHENTICATED', 'Sign in is required.'));
  const result = await db.query(
    `SELECT u.id, u.merchant_id, u.name, u.email, u.role, u.permissions, u.mfa_enabled,
            m.name merchant_name, coalesce(m.environment,'production') environment
       FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN merchants m ON m.id=u.merchant_id
      WHERE s.token_hash=$1 AND s.expires_at > now()`, [tokenHash(token)],
  );
  if (!result.rowCount) return reply.code(401).send(apiError(request, 'UNAUTHENTICATED', 'Your session has expired.'));
  const row = result.rows[0];
  request.actor = { id: row.id, merchantId: row.merchant_id, name: row.name, email: row.email, role: row.role, permissions: row.permissions, mfaEnabled: row.mfa_enabled, merchantName: row.merchant_name, environment: row.environment, authType: 'session' };
}

export function authenticateSessionOrApiKey(db: Db, pepper: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authorization = request.headers.authorization;
    if (!authorization) return authenticate(db, request, reply);
    const match = /^Bearer ([^\s]+)$/.exec(authorization);
    const row = match ? await verifyApiKey(db, match[1]!, pepper) : null;
    if (!row) return reply.code(401).send(apiError(request, 'UNAUTHENTICATED', 'Authentication failed.'));
    request.actor = { id: `api_key:${row.id}`, merchantId: row.merchant_id, name: row.name, email: '', role: 'API_KEY', permissions: row.scopes, mfaEnabled: false, merchantName: row.merchant_name, environment: row.environment, authType: 'apiKey', apiKeyId: row.id };
  };
}

export function requireSession(request: FastifyRequest, reply: FastifyReply) {
  if (request.actor?.authType === 'apiKey') return reply.code(403).send(apiError(request, 'FORBIDDEN', 'A browser session is required.'));
}

export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.actor?.permissions.includes(permission)) {
      return reply.code(403).send(apiError(request, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    }
  };
}

export function apiError(request: FastifyRequest, code: string, message: string, fields?: Record<string, string>) {
  return { error: { code, message, requestId: request.id, ...(fields ? { fields } : {}) } };
}
