import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from './db.js';
import { verifyApiKey } from './developer/apiKeys.js';
import type { Config } from './config.js';
import { rateLimit, type RateLimitStore } from './rateLimit.js';
import { operationalMetrics } from './operations/metrics.js';

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

export async function authenticate(db: Db, config:Config, request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) {operationalMetrics.increment('authentication_denials_total',{reason:'missing_session'});return reply.code(401).send(apiError(request, 'UNAUTHENTICATED', 'Sign in is required.'));}
  const result = await db.query(
    `SELECT u.id, u.merchant_id, u.name, u.email,coalesce(mr.name,u.role) role,coalesce(mr.permissions,u.permissions) permissions, u.mfa_enabled,
            m.name merchant_name, coalesce(m.environment,'production') environment
       FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN merchants m ON m.id=u.merchant_id
       LEFT JOIN user_role_assignments ura ON ura.user_id=u.id LEFT JOIN merchant_roles mr ON mr.id=ura.role_id AND mr.merchant_id=u.merchant_id
      WHERE s.token_hash=$1 AND s.expires_at > now() AND s.absolute_expires_at > now()
        AND s.revoked_at IS NULL AND u.status='ACTIVE' AND s.last_seen_at > now()-($2 || ' minutes')::interval`, [tokenHash(token),String(config.SESSION_IDLE_MINUTES)],
  );
  if (!result.rowCount) {operationalMetrics.increment('authentication_denials_total',{reason:'invalid_session'});return reply.code(401).send(apiError(request, 'UNAUTHENTICATED', 'Your session has expired.'));}
  await db.query('UPDATE sessions SET last_seen_at=now() WHERE token_hash=$1',[tokenHash(token)]);
  const row = result.rows[0];
  request.actor = { id: row.id, merchantId: row.merchant_id, name: row.name, email: row.email, role: row.role, permissions: row.permissions, mfaEnabled: row.mfa_enabled, merchantName: row.merchant_name, environment: row.environment, authType: 'session' };
}

export function authenticateSessionOrApiKey(db: Db, pepper: string,rateLimits:RateLimitStore,config:Config) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authorization = request.headers.authorization;
    if (!authorization) await authenticate(db,config, request, reply);
    else {
    const match = /^Bearer ([^\s]+)$/.exec(authorization);
    const row = match ? await verifyApiKey(db, match[1]!, pepper) : null;
    if (!row) { await rateLimit(rateLimits,config,'invalid-api-key',10,900,r=>`${r.ip}:${match?.[1]??'malformed'}`)(request,reply);if(reply.sent)return;return reply.code(401).send(apiError(request, 'UNAUTHENTICATED', 'Authentication failed.')); }
    request.actor = { id: `api_key:${row.id}`, merchantId: row.merchant_id, name: row.name, email: '', role: 'API_KEY', permissions: row.scopes, mfaEnabled: false, merchantName: row.merchant_name, environment: row.environment, authType: 'apiKey', apiKeyId: row.id };
    }
    if(reply.sent||!request.actor)return;
    if(['POST','PATCH','DELETE'].includes(request.method)&&(/^\/v1\/(payment-links|refunds)(\/|$)/.test(request.url)||/^\/v1\/admin\/refunds\//.test(request.url))){
      await rateLimit(rateLimits,config,'payment-refund-mutation',30,60,r=>`${r.actor?.merchantId}:${r.actor?.id}`)(request,reply);
    }
  };
}

export function requireSession(request: FastifyRequest, reply: FastifyReply) {
  if (request.actor?.authType === 'apiKey') return reply.code(403).send(apiError(request, 'FORBIDDEN', 'A browser session is required.'));
}

export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    if (!request.actor?.permissions.includes(permission)) {
      return reply.code(403).send(apiError(request, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    }
  };
}

export function apiError(request: FastifyRequest, code: string, message: string, fields?: Record<string, string>) {
  return { error: { code, message, requestId: request.id, ...(fields ? { fields } : {}) } };
}
