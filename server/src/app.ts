import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import argon2 from 'argon2';
import { timingSafeEqual } from 'node:crypto';
import { Readable } from 'node:stream';
import { z, ZodError } from 'zod';
import type { Db } from './db.js';
import { transaction } from './db.js';
import type { Config } from './config.js';
import {
  apiError,
  authenticate,
  authenticateSessionOrApiKey,
  newId,
  newToken,
  requirePermission,
  SESSION_COOKIE,
  tokenHash,
} from './security.js';
import { MemoryRateLimitStore, rateLimit, type RateLimitStore } from './rateLimit.js';
import { registerReconciliationRoutes } from './reconciliation/routes.js';
import { registerDeveloperRoutes } from './developer/routes.js';
import { registerReportingRoutes } from './reporting/routes.js';
import { registerTeamRoutes } from './team/routes.js';
import { registerOnboardingRoutes } from './onboarding/routes.js';
import { registerPlatformRoutes } from './platform/routes.js';
import { registerDisputeRoutes } from './disputes/routes.js';
import { registerNotificationRoutes } from './notifications/routes.js';
import { registerOperationsRoutes } from './operations/routes.js';
import { operationalMetrics } from './operations/metrics.js';
import { operationalControlGuard } from './operations/controls.js';
import { decideRefundState, RefundDecisionError } from './refundDecision.js';
import { createPaymentProvider } from './providers/index.js';
import type { PaymentProvider } from './providers/types.js';
import { WebhookVerificationError } from './providers/sandboxProvider.js';
import { processPaymentWebhook } from './payments/webhookProcessor.js';
import { LedgerError } from './ledger/ledgerService.js';
import { decryptSecret, encryptSecret } from './developer/webhookSecurity.js';
import { PERMISSIONS, verifyTotp } from './team/security.js';
import {
  destinationHash,
  disabledRegistrationOtpDelivery,
  generateRegistrationOtp,
  maskEmail,
  REGISTRATION_OTP_MAX_ATTEMPTS,
  REGISTRATION_OTP_RESEND_SECONDS,
  REGISTRATION_OTP_TTL_MINUTES,
  registrationOtpHmac,
  type RegistrationOtpDelivery,
  verifyRegistrationOtp,
} from './registrationOtp.js';

declare module 'fastify' {
  interface FastifyRequest {
    rawWebhookBody?: Buffer;
    traceId?: string;
  }
}

class WebhookBodyTooLargeError extends Error {}
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$QA+ranBBtfurTEAhsgAHlw$ZTuNYj8EHUqIg6tnC8L8ciedsOGjeBTM5gakEiJNUE8';

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const idempotencySchema = z.string().min(8).max(128);
const customerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.email().optional(),
  phone: z
    .string()
    .regex(/^\+265[0-9]{9}$/)
    .optional(),
});

function money(amountMinor: unknown, currency: string) {
  return { amountMinor: Number(amountMinor), currency };
}
function session(actor: NonNullable<import('./security.js').Actor>) {
  return {
    user: {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: actor.role,
      permissions: actor.permissions,
      merchantId: actor.merchantId,
      merchantName: actor.merchantName,
      mfaEnabled: actor.mfaEnabled,
    },
    environment: actor.environment,
    environments: [actor.environment],
  };
}
function payment(row: any) {
  return {
    id: row.id,
    reference: row.reference,
    merchantReference: row.merchant_reference,
    description: row.description,
    status: row.status,
    channel: row.channel,
    providerName: row.provider_name,
    gross: money(row.gross_minor, row.currency),
    fee: money(row.fee_minor, row.currency),
    tax: money(row.tax_minor, row.currency),
    net: money(
      Number(row.gross_minor) - Number(row.fee_minor) - Number(row.tax_minor),
      row.currency,
    ),
    refundableAmountMinor: Number(row.gross_minor) - Number(row.refunded_minor),
    refundedAmountMinor: Number(row.refunded_minor),
    customer: row.customer,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    reconciliationState: row.reconciliation_state,
    settlementState: row.settlement_state,
  };
}
function link(row: any, origin: string) {
  return {
    id: row.id,
    name: row.name,
    mode: row.mode,
    amount: row.amount_minor == null ? null : money(row.amount_minor, row.currency),
    description: row.description,
    customerReference: row.customer_reference,
    status: row.status,
    reusable: row.reusable,
    maxSuccessfulPayments: row.max_successful_payments,
    successfulPaymentsCount: row.successful_payments_count,
    redirectUrl: row.redirect_url,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    url: `${origin}/checkout/${row.token}`,
  };
}
function refund(row: any) {
  return {
    id: row.id,
    reference: row.reference,
    paymentId: row.payment_id,
    paymentReference: row.payment_reference,
    amount: money(row.amount_minor, row.currency),
    reason: row.reason,
    status: row.status,
    requestedBy: { id: row.requested_by, name: row.requested_by_name },
    approvedBy: row.approved_by ? { id: row.approved_by, name: row.approved_by_name } : null,
    decidedBy: row.decided_by ? { id: row.decided_by, name: row.decided_by_name } : null,
    decisionNote: row.decision_note,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function buildApp(
  config: Config,
  db: Db,
  provider: PaymentProvider = createPaymentProvider(config),
  workersReady: () => boolean = () => true,
  suppliedRateLimits?: RateLimitStore,
  registrationDelivery: RegistrationOtpDelivery = disabledRegistrationOtpDelivery,
) {
  if (config.NODE_ENV === 'production' && !suppliedRateLimits)
    throw new Error('A distributed rate-limit store is required in production');
  const rateLimits = suppliedRateLimits ?? new MemoryRateLimitStore();
  const trustedProxies = config.TRUSTED_PROXIES.split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const app = Fastify({
    logger:
      config.NODE_ENV === 'test'
        ? false
        : {
            level: config.LOG_LEVEL,
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers.x-csrf-token',
                'res.headers.set-cookie',
                'password',
                '*.password',
                '*.token',
                '*.secret',
                '*.code',
                '*.email',
                '*.phone',
                'config.DATABASE_URL',
                'config.REDIS_URL',
              ],
              censor: '[REDACTED]',
            },
          },
    trustProxy: trustedProxies.length ? trustedProxies : false,
    bodyLimit: 1024 * 1024,
    genReqId: (req) => {
      const value = req.headers['x-request-id'];
      return typeof value === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(value)
        ? value
        : newId('req');
    },
  });
  await app.register(cookie, { secret: config.COOKIE_SECRET });
  await app.register(cors, {
    origin: config.FRONTEND_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(helmet, {
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    hsts: config.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'no-referrer' },
  });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
  app.decorateRequest('actor', null);
  app.decorateRequest('rawWebhookBody', undefined);
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && origin !== config.FRONTEND_ORIGIN) {
      return reply
        .code(403)
        .send(apiError(request, 'ORIGIN_REJECTED', 'Request origin is not allowed.'));
    }
  });
  app.addHook('onClose', async () => {
    await rateLimits.close();
  });
  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Request-Id', request.id);
    const value = request.headers.traceparent;
    if (typeof value === 'string' && /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/.test(value)) {
      request.traceId = value.slice(3, 35);
      reply.header('traceparent', value);
    }
  });
  const requestStarted = new WeakMap<object, number>();
  app.addHook('onRequest', async (request) => {
    requestStarted.set(request, performance.now());
  });
  app.addHook('onResponse', async (request, reply) => {
    const route = request.routeOptions.url ?? 'unmatched',
      statusClass = `${Math.floor(reply.statusCode / 100)}xx`,
      method = request.method.toUpperCase();
    operationalMetrics.increment('http_requests_total', { method, route, statusClass });
    operationalMetrics.duration(
      'http_request_duration_ms',
      { method, route },
      performance.now() - (requestStarted.get(request) ?? performance.now()),
    );
  });
  app.addHook('onError', async (request, _reply, error) => {
    operationalMetrics.increment('application_errors_total', {
      route: request.routeOptions.url ?? 'unmatched',
      kind: error instanceof ZodError ? 'validation' : 'internal',
    });
  });
  const clientIp = (request: import('fastify').FastifyRequest) => request.ip;
  app.addHook('onRequest', async (request, reply) => {
    if (
      ['POST', 'PUT', 'PATCH'].includes(request.method) &&
      (request.headers['content-length'] || request.headers['transfer-encoding'])
    ) {
      const type = String(request.headers['content-type'] ?? '').split(';')[0] ?? '';
      if (type !== 'application/json' && !type.startsWith('multipart/form-data'))
        return reply
          .code(415)
          .send(
            apiError(request, 'UNSUPPORTED_MEDIA_TYPE', 'Use a supported request content type.'),
          );
    }
  });
  app.addHook('onRequest', async (request, reply) =>
    rateLimit(
      rateLimits,
      config,
      request.url.startsWith('/v1/health') ? 'health' : 'general',
      request.url.startsWith('/v1/health') ? 120 : config.RATE_LIMIT_GENERAL_MAX,
      config.RATE_LIMIT_GENERAL_WINDOW_SECONDS,
      clientIp,
      false,
    )(request, reply),
  );
  app.addHook('preHandler', async (request, reply) => {
    if (
      !['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) ||
      request.headers.authorization ||
      !request.cookies[SESSION_COOKIE]
    )
      return;
    const origin = request.headers.origin;
    if (origin !== config.FRONTEND_ORIGIN)
      return reply
        .code(403)
        .send(apiError(request, 'ORIGIN_REJECTED', 'Request origin is not allowed.'));
    const cookie = request.cookies.giantpay_csrf,
      header = request.headers['x-csrf-token'];
    if (
      !cookie ||
      typeof header !== 'string' ||
      cookie.length !== header.length ||
      !timingSafeEqual(Buffer.from(cookie), Buffer.from(header))
    )
      return reply
        .code(403)
        .send(apiError(request, 'CSRF_REJECTED', 'A valid CSRF token is required.'));
  });
  app.addHook('preParsing', async (request, _reply, payload) => {
    if (request.url.split('?')[0] !== '/v1/webhooks/providers/sandbox') return payload;
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of payload) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > 64 * 1024) throw new WebhookBodyTooLargeError();
      chunks.push(buffer);
    }
    request.rawWebhookBody = Buffer.concat(chunks);
    return Readable.from(request.rawWebhookBody);
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof WebhookBodyTooLargeError) {
      return reply
        .code(413)
        .send(apiError(request, 'PAYLOAD_TOO_LARGE', 'Webhook payload is too large.'));
    }
    if (error instanceof ZodError) {
      const fields = Object.fromEntries(
        error.issues.map((i) => [i.path.join('.') || 'request', i.message]),
      );
      return reply
        .code(422)
        .send(apiError(request, 'VALIDATION_ERROR', 'Check the highlighted fields.', fields));
    }
    if (error instanceof LedgerError) {
      const status =
        error.code === 'LEDGER_ENTRY_NOT_FOUND'
          ? 404
          : error.code === 'LEDGER_REVERSAL_CONFLICT'
            ? 409
            : 422;
      return reply.code(status).send(apiError(request, error.code, error.message));
    }
    if (
      (error as any)?.code === '23514' &&
      /reconciliation exception transition/i.test((error as Error).message)
    ) {
      return reply
        .code(409)
        .send(
          apiError(request, 'STATE_CONFLICT', 'The requested state transition is not allowed.'),
        );
    }
    request.log.error(error);
    return reply.code(500).send(apiError(request, 'INTERNAL_ERROR', 'Something went wrong.'));
  });

  const bounded = async (work: Promise<unknown>) =>
    Promise.race([
      work,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('dependency timeout')), config.HEALTH_CHECK_TIMEOUT_MS),
      ),
    ]);
  const dependency = async (name: 'postgresql' | 'redis', work: Promise<unknown>) => {
    try {
      await bounded(work);
      operationalMetrics.increment('dependency_checks_total', {
        dependency: name,
        outcome: 'available',
      });
    } catch (error) {
      operationalMetrics.increment('dependency_checks_total', {
        dependency: name,
        outcome: 'unavailable',
      });
      throw error;
    }
  };
  const readiness = async () => {
    await Promise.all([
      dependency('postgresql', db.query('SELECT 1')),
      dependency('redis', rateLimits.ping()),
    ]);
    if (!workersReady()) throw new Error('workers unavailable');
  };
  app.get('/v1/health/live', async () => ({ status: 'alive' }));
  app.get('/v1/health/ready', async (_request, reply) => {
    try {
      await readiness();
      return { status: 'ready' };
    } catch {
      return reply.code(503).send({ status: 'unavailable' });
    }
  });
  app.get('/health/live', async () => ({ status: 'alive' }));
  app.get('/health/ready', async (_request, reply) => {
    try {
      await readiness();
      return { status: 'ready' };
    } catch {
      return reply.code(503).send({ status: 'unavailable' });
    }
  });
  app.get('/v1/health', async (_request, reply) => {
    try {
      await readiness();
      return { status: 'ok' };
    } catch {
      return reply.code(503).send({ status: 'unavailable' });
    }
  });

  const registerSchema = z.object({
    businessName: z.string().trim().min(2),
    email: z.email(),
    password: z.string().min(12),
    phone: z.string().regex(/^\+265[0-9]{9}$/),
  });
  const registrationLimits = [
    rateLimit(rateLimits, config, 'registration:ip', 5, 3600, clientIp),
    rateLimit(rateLimits, config, 'registration:destination', 3, 3600, (r) =>
      String((r.body as any)?.email ?? ''),
    ),
  ];
  app.post('/v1/auth/register', { preHandler: registrationLimits }, async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const exists = await db.query('SELECT 1 FROM users WHERE normalized_email=lower(trim($1))', [
      body.email,
    ]);
    if (exists.rowCount)
      return reply.code(202).send({
        accepted: true,
        verificationRequired: true,
        delivery: { available: false, queued: false },
      });
    const merchantId = newId('mch');
    const userId = newId('usr');
    const challengeId = newToken(),
      code = generateRegistrationOtp(),
      expiresAt = new Date(Date.now() + REGISTRATION_OTP_TTL_MINUTES * 60_000).toISOString();
    const passwordHash = await argon2.hash(body.password + config.PASSWORD_PEPPER, {
      type: argon2.argon2id,
    });
    await transaction(db, async (client) => {
      await client.query('INSERT INTO merchants(id,name) VALUES($1,$2)', [
        merchantId,
        body.businessName,
      ]);
      await client.query(
        `INSERT INTO users(id,merchant_id,name,email,normalized_email,password_hash,role,permissions,status) VALUES($1,$2,$3,$4,lower(trim($4)),$5,'OWNER',$6,'PENDING_VERIFICATION')`,
        [userId, merchantId, body.businessName, body.email, passwordHash, [...PERMISSIONS]],
      );
      const roleId = newId('role');
      await client.query(
        `INSERT INTO merchant_roles(id,merchant_id,name,normalized_name,description,permissions,system_role,created_by) VALUES($1,$2,'Owner','owner','Full merchant-level control',$3,true,$4)`,
        [roleId, merchantId, [...PERMISSIONS], userId],
      );
      await client.query(
        `INSERT INTO user_role_assignments(user_id,merchant_id,role_id,assigned_by) VALUES($1,$2,$3,$1)`,
        [userId, merchantId, roleId],
      );
      await client.query(
        `INSERT INTO registration_email_challenges(id,user_id,destination_hash,otp_hmac,expires_at,resend_available_at) VALUES($1,$2,$3,$4,$5,now()+($6 || ' seconds')::interval)`,
        [
          challengeId,
          userId,
          destinationHash(config, body.email),
          registrationOtpHmac(config, challengeId, code),
          expiresAt,
          String(REGISTRATION_OTP_RESEND_SECONDS),
        ],
      );
      await client.query(
        `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,'REGISTRATION_OTP_ISSUED','registration_challenge',$4,$5)`,
        [
          newId('aud'),
          userId,
          merchantId,
          challengeId,
          { deliveryAvailable: registrationDelivery.available },
        ],
      );
      await client.query(
        `INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,deduplication_key) VALUES($1,'registration.otp.requested','registration_challenge',$2,$3,$4)`,
        [
          newId('obx'),
          challengeId,
          { userId, deliveryAvailable: registrationDelivery.available },
          `registration-otp:${challengeId}`,
        ],
      );
    });
    const deliveryResult = await registrationDelivery.queue({
      challengeId,
      destination: body.email,
      code,
      expiresAt,
    });
    await db.query(
      `UPDATE registration_email_challenges SET delivery_state=$1,delivery_provider=$2,delivery_attempted_at=$3,delivery_failure_code=$4 WHERE id=$5`,
      [
        deliveryResult.queued ? 'QUEUED' : registrationDelivery.available ? 'FAILED' : 'DISABLED',
        deliveryResult.provider,
        deliveryResult.attemptedAt,
        deliveryResult.failureCode ?? null,
        challengeId,
      ],
    );
    await db.query(
      `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata)
       VALUES($1,$2,$3,'REGISTRATION_OTP_DELIVERY_ATTEMPTED','registration_challenge',$4,$5)`,
      [
        newId('aud'),
        userId,
        merchantId,
        challengeId,
        {
          state: deliveryResult.queued ? 'QUEUED' : registrationDelivery.available ? 'FAILED' : 'DISABLED',
          provider: deliveryResult.provider,
          attemptedAt: deliveryResult.attemptedAt,
          destination: maskEmail(body.email),
          ...(deliveryResult.failureCode ? { failureCode: deliveryResult.failureCode } : {}),
        },
      ],
    );
    return reply.code(202).send({
      accepted: true,
      verificationRequired: true,
      challengeId,
      maskedDestination: maskEmail(body.email),
      expiresAt,
      resendAvailableAt: new Date(
        Date.now() + REGISTRATION_OTP_RESEND_SECONDS * 1000,
      ).toISOString(),
      delivery: {
        available: registrationDelivery.available,
        queued: deliveryResult.queued,
        ...(deliveryResult.failureCode ? { errorCode: deliveryResult.failureCode } : {}),
      },
    });
  });
  const loginIp = rateLimit(rateLimits, config, 'login:ip', 10, 900, clientIp),
    loginIdentity = rateLimit(rateLimits, config, 'login:identity', 5, 900, (r) =>
      String((r.body as any)?.email ?? ''),
    );
  app.post('/v1/auth/login', { preHandler: [loginIp, loginIdentity] }, async (request, reply) => {
    const body = z
      .object({ email: z.email(), password: z.string().min(1), remember: z.boolean().optional() })
      .parse(request.body);
    const found = await db.query(
      `SELECT u.*,coalesce(mr.name,u.role) effective_role,coalesce(mr.permissions,u.permissions) effective_permissions,m.name merchant_name,m.environment FROM users u LEFT JOIN merchants m ON m.id=u.merchant_id LEFT JOIN user_role_assignments a ON a.user_id=u.id LEFT JOIN merchant_roles mr ON mr.id=a.role_id WHERE u.normalized_email=lower(trim($1))`,
      [body.email],
    );
    const user = found.rows[0];
    const passwordValid = await argon2.verify(
      user?.password_hash ?? DUMMY_PASSWORD_HASH,
      body.password + config.PASSWORD_PEPPER,
    );
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      (user.locked_until && new Date(user.locked_until) > new Date()) ||
      !passwordValid
    ) {
      return reply
        .code(401)
        .send(apiError(request, 'INVALID_CREDENTIALS', 'That email or password is incorrect.'));
    }
    await db.query('UPDATE users SET failed_logins=0,locked_until=NULL WHERE id=$1', [user.id]);
    if (user.mfa_enabled) {
      const challenge = newToken();
      await db.query(
        `INSERT INTO authentication_challenges(id,user_id,purpose,expires_at) VALUES($1,$2,'LOGIN',now()+interval '5 minutes')`,
        [tokenHash(challenge), user.id],
      );
      return {
        status: 'MFA_REQUIRED',
        mfaChallenge: {
          challengeId: challenge,
          method: 'TOTP',
          codeLength: 6,
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          resendAvailableAt: new Date(Date.now() + 300000).toISOString(),
        },
      };
    }
    const token = newToken(),
      csrfToken = newToken();
    const hours = body.remember
      ? Math.min(config.SESSION_TTL_HOURS * 30, config.SESSION_ABSOLUTE_HOURS)
      : Math.min(config.SESSION_TTL_HOURS, config.SESSION_ABSOLUTE_HOURS);
    await db.query(`DELETE FROM sessions WHERE user_id=$1`, [user.id]);
    await db.query(
      `INSERT INTO sessions(token_hash,user_id,expires_at,absolute_expires_at,last_seen_at) VALUES($1,$2,now()+($3 || ' hours')::interval,now()+($4 || ' hours')::interval,now())`,
      [tokenHash(token), user.id, String(hours), String(config.SESSION_ABSOLUTE_HOURS)],
    );
    const secure = config.NODE_ENV === 'production' || config.COOKIE_SECURE === true;
    reply.setCookie(SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: hours * 3600,
    });
    reply.setCookie('giantpay_csrf', csrfToken, {
      path: '/',
      httpOnly: false,
      sameSite: 'strict',
      secure,
      maxAge: hours * 3600,
    });
    const actor = {
      id: user.id,
      merchantId: user.merchant_id,
      name: user.name,
      email: user.email,
      role: user.effective_role,
      permissions: user.effective_permissions,
      mfaEnabled: user.mfa_enabled,
      merchantName: user.merchant_name,
      environment: user.environment ?? 'production',
    } as const;
    return { status: 'AUTHENTICATED', session: session(actor), csrfToken };
  });
  app.get(
    '/v1/auth/session',
    { preHandler: [authenticate.bind(null, db, config)] },
    async (request) => ({ session: session(request.actor!) }),
  );
  app.post('/v1/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) await db.query('DELETE FROM sessions WHERE token_hash=$1', [tokenHash(token)]);
    reply
      .clearCookie(SESSION_COOKIE, { path: '/' })
      .clearCookie('giantpay_csrf', { path: '/' })
      .code(204)
      .send();
  });
  app.post(
    '/v1/auth/password/forgot',
    {
      preHandler: [
        rateLimit(rateLimits, config, 'password-forgot:ip', 5, 3600, clientIp),
        rateLimit(rateLimits, config, 'password-forgot:identity', 3, 3600, (r) =>
          String((r.body as any)?.email ?? ''),
        ),
      ],
    },
    async (request, reply) => {
      const { email } = z.object({ email: z.email() }).parse(request.body),
        user = (
          await db.query(
            `SELECT id,merchant_id FROM users WHERE normalized_email=lower(trim($1)) AND status='ACTIVE'`,
            [email],
          )
        ).rows[0];
      if (user) {
        const token = newToken();
        await transaction(db, async (c) => {
          await c.query(
            'UPDATE password_reset_requests SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',
            [user.id],
          );
          const id = newId('rst');
          await c.query(
            `INSERT INTO password_reset_requests(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '30 minutes')`,
            [id, user.id, tokenHash(token)],
          );
          await c.query(
            `INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,deduplication_key) VALUES($1,'security.password_reset.requested','password_reset',$2,$3,$4)`,
            [
              newId('obx'),
              id,
              {
                userId: user.id,
                tokenCiphertext: encryptSecret(
                  token,
                  config.WEBHOOK_SECRET_KEY ?? config.COOKIE_SECRET,
                ),
              },
              `password-reset:${id}`,
            ],
          );
        });
      }
      return reply.code(202).send({ accepted: true });
    },
  );
  app.post(
    '/v1/auth/password/reset',
    { preHandler: [rateLimit(rateLimits, config, 'password-reset:ip', 5, 3600, clientIp)] },
    async (request, reply) => {
      const b = z
          .object({ token: z.string().min(32), password: z.string().min(12) })
          .parse(request.body),
        passwordHash = await argon2.hash(b.password + config.PASSWORD_PEPPER, {
          type: argon2.argon2id,
        });
      const changed = await transaction(db, async (c) => {
        const x = await c.query(
          `SELECT * FROM password_reset_requests WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE`,
          [tokenHash(b.token)],
        );
        if (!x.rowCount) return null;
        await c.query('UPDATE password_reset_requests SET used_at=now() WHERE id=$1', [
          x.rows[0].id,
        ]);
        await c.query('UPDATE users SET password_hash=$1 WHERE id=$2', [
          passwordHash,
          x.rows[0].user_id,
        ]);
        await c.query(
          'UPDATE sessions SET revoked_at=coalesce(revoked_at,now()) WHERE user_id=$1',
          [x.rows[0].user_id],
        );
        await c.query(
          `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) SELECT $1,u.id,u.merchant_id,'PASSWORD_RESET_COMPLETED','user',u.id FROM users u WHERE u.id=$2`,
          [newId('aud'), x.rows[0].user_id],
        );
        return x.rows[0];
      });
      return changed
        ? { accepted: true }
        : reply
            .code(401)
            .send(
              apiError(request, 'PASSWORD_RESET_INVALID', 'Reset token is invalid or expired.'),
            );
    },
  );
  app.post(
    '/v1/auth/mfa/verify',
    {
      preHandler: [
        rateLimit(rateLimits, config, 'mfa:ip', 10, 900, clientIp),
        rateLimit(rateLimits, config, 'mfa:challenge', 5, 900, (r) =>
          String((r.body as any)?.challengeId ?? ''),
        ),
      ],
    },
    async (request, reply) => {
      const b = z
        .object({ challengeId: z.string().min(32), code: z.string().regex(/^\d{6}$/) })
        .parse(request.body);
      const result = await transaction(db, async (c) => {
        const x = await c.query(
          `SELECT ch.id challenge_id,ch.user_id,e.secret_ciphertext,e.last_counter,u.*,m.name merchant_name,m.environment,coalesce(mr.name,u.role) effective_role,coalesce(mr.permissions,u.permissions) effective_permissions FROM authentication_challenges ch JOIN users u ON u.id=ch.user_id JOIN mfa_enrollments e ON e.user_id=u.id LEFT JOIN merchants m ON m.id=u.merchant_id LEFT JOIN user_role_assignments a ON a.user_id=u.id LEFT JOIN merchant_roles mr ON mr.id=a.role_id WHERE ch.id=$1 AND ch.purpose='LOGIN' AND ch.used_at IS NULL AND ch.expires_at>now() AND u.status='ACTIVE' FOR UPDATE`,
          [tokenHash(b.challengeId)],
        );
        if (!x.rowCount) return null;
        const u = x.rows[0],
          counter = verifyTotp(
            decryptSecret(u.secret_ciphertext, config.WEBHOOK_SECRET_KEY ?? config.COOKIE_SECRET),
            b.code,
            u.last_counter === null ? null : Number(u.last_counter),
          );
        if (counter === null) return null;
        await c.query('UPDATE authentication_challenges SET used_at=now() WHERE id=$1', [
          u.challenge_id,
        ]);
        await c.query('UPDATE mfa_enrollments SET last_counter=$1 WHERE user_id=$2', [
          counter,
          u.user_id,
        ]);
        const token = newToken(),
          csrf = newToken();
        await c.query(
          `INSERT INTO sessions(token_hash,public_id,user_id,expires_at,absolute_expires_at,last_seen_at,mfa_verified_at) VALUES($1,$2,$3,now()+interval '12 hours',now()+interval '24 hours',now(),now())`,
          [tokenHash(token), newId('ses'), u.user_id],
        );
        return { u, token, csrf };
      });
      if (!result)
        return reply.code(401).send(apiError(request, 'INVALID_MFA_CODE', 'Verification failed.'));
      const secure = config.NODE_ENV === 'production' || config.COOKIE_SECURE === true;
      reply.setCookie(SESSION_COOKIE, result.token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: 43200,
      });
      reply.setCookie('giantpay_csrf', result.csrf, {
        path: '/',
        httpOnly: false,
        sameSite: 'strict',
        secure,
        maxAge: 43200,
      });
      const u = result.u,
        actor = {
          id: u.user_id,
          merchantId: u.merchant_id,
          name: u.name,
          email: u.email,
          role: u.effective_role,
          permissions: u.effective_permissions,
          mfaEnabled: true,
          merchantName: u.merchant_name,
          environment: u.environment ?? 'production',
        } as const;
      return { session: session(actor), csrfToken: result.csrf };
    },
  );
  const registrationVerifyLimits = [
    rateLimit(rateLimits, config, 'registration-otp-verify:ip', 20, 3600, clientIp),
    rateLimit(rateLimits, config, 'registration-otp-verify:challenge', 10, 3600, (r) =>
      String((r.body as any)?.challengeId ?? ''),
    ),
  ];
  app.post(
    '/v1/auth/registration/verify',
    { preHandler: registrationVerifyLimits },
    async (request, reply) => {
      const body = z
        .object({ challengeId: z.string().min(32), code: z.string().regex(/^\d{6}$/) })
        .parse(request.body);
      const outcome = await transaction(db, async (c) => {
        const found = await c.query(
          `SELECT ch.*,u.merchant_id,u.status FROM registration_email_challenges ch JOIN users u ON u.id=ch.user_id WHERE ch.id=$1 FOR UPDATE`,
          [body.challengeId],
        );
        if (!found.rowCount)
          return {
            status: 401,
            code: 'REGISTRATION_OTP_INVALID',
            message: 'The verification code is invalid.',
          };
        const ch = found.rows[0];
        if (ch.used_at)
          return {
            status: 409,
            code: 'REGISTRATION_OTP_REUSED',
            message: 'This verification code has already been used.',
          };
        if (ch.invalidated_at)
          return {
            status: 401,
            code: 'REGISTRATION_OTP_INVALID',
            message: 'The verification code is invalid.',
          };
        if (new Date(ch.expires_at) <= new Date()) {
          await c.query(
            'UPDATE registration_email_challenges SET invalidated_at=coalesce(invalidated_at,now()) WHERE id=$1',
            [ch.id],
          );
          await c.query(
            `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'REGISTRATION_OTP_EXPIRED','registration_challenge',$4)`,
            [newId('aud'), ch.user_id, ch.merchant_id, ch.id],
          );
          return {
            status: 410,
            code: 'REGISTRATION_OTP_EXPIRED',
            message: 'The verification code has expired.',
          };
        }
        if (Number(ch.attempt_count) >= REGISTRATION_OTP_MAX_ATTEMPTS)
          return {
            status: 429,
            code: 'REGISTRATION_OTP_ATTEMPTS_EXHAUSTED',
            message: 'Too many verification attempts. Start registration again.',
          };
        if (!verifyRegistrationOtp(config, ch.id, body.code, ch.otp_hmac)) {
          const attempts = Number(ch.attempt_count) + 1;
          await c.query(
            'UPDATE registration_email_challenges SET attempt_count=$1::integer,invalidated_at=CASE WHEN $1::integer >= $2::integer THEN now() ELSE invalidated_at END WHERE id=$3',
            [attempts, REGISTRATION_OTP_MAX_ATTEMPTS, ch.id],
          );
          if (attempts >= REGISTRATION_OTP_MAX_ATTEMPTS) {
            await c.query(
              `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'REGISTRATION_OTP_EXHAUSTED','registration_challenge',$4)`,
              [newId('aud'), ch.user_id, ch.merchant_id, ch.id],
            );
            return {
              status: 429,
              code: 'REGISTRATION_OTP_ATTEMPTS_EXHAUSTED',
              message: 'Too many verification attempts. Start registration again.',
            };
          }
          return {
            status: 401,
            code: 'REGISTRATION_OTP_INVALID',
            message: 'The verification code is invalid.',
          };
        }
        await c.query('UPDATE registration_email_challenges SET used_at=now() WHERE id=$1', [
          ch.id,
        ]);
        await c.query(
          `UPDATE users SET status='ACTIVE',email_verified_at=now() WHERE id=$1 AND status='PENDING_VERIFICATION'`,
          [ch.user_id],
        );
        await c.query(
          `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'REGISTRATION_OTP_VERIFIED','registration_challenge',$4)`,
          [newId('aud'), ch.user_id, ch.merchant_id, ch.id],
        );
        return { status: 200, verified: true };
      });
      if ('code' in outcome)
        return reply.code(outcome.status).send(apiError(request, outcome.code!, outcome.message!));
      return { verified: true };
    },
  );
  const resendLimits = [
    rateLimit(rateLimits, config, 'registration-otp-resend:ip', 5, 3600, clientIp),
    rateLimit(rateLimits, config, 'registration-otp-resend:challenge', 3, 3600, (r) =>
      String((r.body as any)?.challengeId ?? ''),
    ),
  ];
  app.post('/v1/auth/registration/resend', { preHandler: resendLimits }, async (request, reply) => {
    const body = z.object({ challengeId: z.string().min(32) }).parse(request.body);
    const code = generateRegistrationOtp(),
      nextId = newToken(),
      expiresAt = new Date(Date.now() + REGISTRATION_OTP_TTL_MINUTES * 60_000).toISOString();
    const result = await transaction(db, async (c) => {
      const x = await c.query(
        `SELECT ch.*,u.email,u.merchant_id,u.status FROM registration_email_challenges ch JOIN users u ON u.id=ch.user_id WHERE ch.id=$1 FOR UPDATE`,
        [body.challengeId],
      );
      if (!x.rowCount || x.rows[0].status !== 'PENDING_VERIFICATION') return null;
      const old = x.rows[0];
      if (new Date(old.resend_available_at) > new Date())
        return {
          cooldown: true,
          retryAfter: Math.max(
            1,
            Math.ceil((new Date(old.resend_available_at).getTime() - Date.now()) / 1000),
          ),
        };
      await c.query(
        'UPDATE registration_email_challenges SET invalidated_at=coalesce(invalidated_at,now()) WHERE user_id=$1 AND used_at IS NULL AND invalidated_at IS NULL',
        [old.user_id],
      );
      await c.query(
        `INSERT INTO registration_email_challenges(id,user_id,destination_hash,otp_hmac,expires_at,resend_available_at) VALUES($1,$2,$3,$4,$5,now()+($6 || ' seconds')::interval)`,
        [
          nextId,
          old.user_id,
          old.destination_hash,
          registrationOtpHmac(config, nextId, code),
          expiresAt,
          String(REGISTRATION_OTP_RESEND_SECONDS),
        ],
      );
      await c.query(
        `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,'REGISTRATION_OTP_ISSUED','registration_challenge',$4,$5)`,
        [
          newId('aud'),
          old.user_id,
          old.merchant_id,
          nextId,
          { resend: true, deliveryAvailable: registrationDelivery.available },
        ],
      );
      await c.query(
        `INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,deduplication_key) VALUES($1,'registration.otp.requested','registration_challenge',$2,$3,$4)`,
        [
          newId('obx'),
          nextId,
          { userId: old.user_id, deliveryAvailable: registrationDelivery.available },
          `registration-otp:${nextId}`,
        ],
      );
      return {
        cooldown: false,
        email: old.email,
        userId: old.user_id,
        merchantId: old.merchant_id,
      };
    });
    if (!result)
      return reply
        .code(202)
        .send({ accepted: true, delivery: { available: false, queued: false } });
    if (result.cooldown) {
      reply.header('Retry-After', result.retryAfter);
      return reply
        .code(429)
        .send(
          apiError(
            request,
            'REGISTRATION_OTP_RESEND_COOLDOWN',
            'Wait before requesting another code.',
          ),
        );
    }
    const deliveryResult = await registrationDelivery.queue({
      challengeId: nextId,
      destination: result.email!,
      code,
      expiresAt,
    });
    await db.query(
      `UPDATE registration_email_challenges SET delivery_state=$1,delivery_provider=$2,delivery_attempted_at=$3,delivery_failure_code=$4 WHERE id=$5`,
      [
        deliveryResult.queued ? 'QUEUED' : registrationDelivery.available ? 'FAILED' : 'DISABLED',
        deliveryResult.provider,
        deliveryResult.attemptedAt,
        deliveryResult.failureCode ?? null,
        nextId,
      ],
    );
    await db.query(
      `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata)
       VALUES($1,$2,$3,'REGISTRATION_OTP_DELIVERY_ATTEMPTED','registration_challenge',$4,$5)`,
      [
        newId('aud'),
        result.userId,
        result.merchantId,
        nextId,
        {
          state: deliveryResult.queued ? 'QUEUED' : registrationDelivery.available ? 'FAILED' : 'DISABLED',
          provider: deliveryResult.provider,
          attemptedAt: deliveryResult.attemptedAt,
          destination: maskEmail(result.email!),
          ...(deliveryResult.failureCode ? { failureCode: deliveryResult.failureCode } : {}),
        },
      ],
    );
    return reply.code(202).send({
      accepted: true,
      challengeId: nextId,
      maskedDestination: maskEmail(result.email!),
      expiresAt,
      resendAvailableAt: new Date(
        Date.now() + REGISTRATION_OTP_RESEND_SECONDS * 1000,
      ).toISOString(),
      delivery: {
        available: registrationDelivery.available,
        queued: deliveryResult.queued,
        ...(deliveryResult.failureCode ? { errorCode: deliveryResult.failureCode } : {}),
      },
    });
  });
  app.post(
    '/v1/auth/email/verification-request',
    {
      preHandler: [
        rateLimit(rateLimits, config, 'email-verification-request:ip', 5, 3600, clientIp),
      ],
    },
    async (_request, reply) =>
      reply.code(202).send({ accepted: true, delivery: { available: false, queued: false } }),
  );
  app.post(
    '/v1/auth/email/verify',
    { preHandler: [rateLimit(rateLimits, config, 'email-verify:ip', 10, 3600, clientIp)] },
    async (request, reply) => {
      z.object({ token: z.string().min(1) }).parse(request.body);
      return reply
        .code(410)
        .send(
          apiError(
            request,
            'EMAIL_TOKEN_VERIFICATION_UNAVAILABLE',
            'Use registration email-code verification.',
          ),
        );
    },
  );

  const auth = authenticateSessionOrApiKey(db, config.PASSWORD_PEPPER, rateLimits, config);
  const paymentCreationControl = operationalControlGuard(db, 'PAYMENT_CREATION_PAUSED'),
    refundMutationControl = operationalControlGuard(db, 'REFUND_MUTATIONS_PAUSED');
  await registerDeveloperRoutes(app, config, db, rateLimits);
  await registerReconciliationRoutes(app, config, db, rateLimits);
  await registerReportingRoutes(app, config, db, rateLimits);
  await registerTeamRoutes(app, config, db, rateLimits);
  await registerOnboardingRoutes(app, config, db, rateLimits);
  await registerPlatformRoutes(app, config, db, rateLimits);
  await registerDisputeRoutes(app, config, db, rateLimits);
  await registerNotificationRoutes(app, config, db, rateLimits);
  await registerOperationsRoutes(app, config, db, rateLimits);

  app.get(
    '/v1/payments',
    { preHandler: [auth, requirePermission('payments:read')] },
    async (request) => {
      const q = pageSchema
        .extend({
          search: z.string().max(100).optional(),
          status: z.string().optional(),
          channel: z.string().optional(),
        })
        .parse(request.query);
      const offset = (q.page - 1) * q.pageSize;
      const params: any[] = [request.actor!.merchantId];
      const where = ['merchant_id=$1'];
      if (q.search) {
        params.push(`%${q.search}%`);
        where.push(
          `(reference ILIKE $${params.length} OR merchant_reference ILIKE $${params.length} OR customer->>'name' ILIKE $${params.length})`,
        );
      }
      if (q.status) {
        params.push(q.status.split(','));
        where.push(`status=ANY($${params.length})`);
      }
      if (q.channel) {
        params.push(q.channel.split(','));
        where.push(`channel=ANY($${params.length})`);
      }
      const count = await db.query(
        `SELECT count(*) FROM payments WHERE ${where.join(' AND ')}`,
        params,
      );
      params.push(q.pageSize, offset);
      const rows = await db.query(
        `SELECT * FROM payments WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      return {
        data: rows.rows.map((r: any) => ({
          id: r.id,
          reference: r.reference,
          merchantReference: r.merchant_reference,
          customerName: r.customer.name ?? null,
          amount: money(r.gross_minor, r.currency),
          channel: r.channel,
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
        page: q.page,
        pageSize: q.pageSize,
        total: Number(count.rows[0].count),
      };
    },
  );
  app.get(
    '/v1/payments/:id',
    { preHandler: [auth, requirePermission('payments:read')] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const r = await db.query('SELECT * FROM payments WHERE id=$1 AND merchant_id=$2', [
        id,
        request.actor!.merchantId,
      ]);
      return r.rowCount
        ? payment(r.rows[0])
        : reply.code(404).send(apiError(request, 'NOT_FOUND', 'Payment not found.'));
    },
  );
  app.get(
    '/v1/payments/:id/events',
    { preHandler: [auth, requirePermission('payments:read')] },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const r = await db.query(
        `SELECT e.id,e.type,e.label,e.detail,e.occurred_at "occurredAt" FROM payment_events e JOIN payments p ON p.id=e.payment_id WHERE e.payment_id=$1 AND p.merchant_id=$2 ORDER BY e.occurred_at`,
        [id, request.actor!.merchantId],
      );
      return r.rows;
    },
  );

  const createLinkSchema = z
    .object({
      name: z.string().min(1),
      mode: z.enum(['FIXED', 'CUSTOMER_ENTERED']),
      amountMinor: z.number().int().positive().optional(),
      currency: z.string().regex(/^[A-Z]{3}$/),
      description: z.string().optional(),
      customerReference: z.string().optional(),
      expiresAt: z.iso.datetime().optional(),
      reusable: z.boolean(),
      maxSuccessfulPayments: z.number().int().positive().optional(),
      redirectUrl: z.url().optional(),
    })
    .superRefine((v, c) => {
      if (v.mode === 'CUSTOMER_ENTERED')
        c.addIssue({
          code: 'custom',
          message: 'Customer-entered amounts are not supported yet.',
          path: ['mode'],
        });
      if (v.mode === 'FIXED' && !v.amountMinor)
        c.addIssue({ code: 'custom', message: 'Amount is required.', path: ['amountMinor'] });
    });
  app.get(
    '/v1/payment-links',
    { preHandler: [auth, requirePermission('payments.links:manage')] },
    async (request) => {
      const q = pageSchema.extend({ search: z.string().optional() }).parse(request.query);
      const values: any[] = [request.actor!.merchantId];
      let clause = 'merchant_id=$1';
      if (q.search) {
        values.push(`%${q.search}%`);
        clause += ` AND name ILIKE $2`;
      }
      const total = await db.query(`SELECT count(*) FROM payment_links WHERE ${clause}`, values);
      values.push(q.pageSize, (q.page - 1) * q.pageSize);
      const rows = await db.query(
        `SELECT * FROM payment_links WHERE ${clause} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      return {
        data: rows.rows.map((r: any) => link(r, config.FRONTEND_ORIGIN)),
        page: q.page,
        pageSize: q.pageSize,
        total: Number(total.rows[0].count),
      };
    },
  );
  app.post(
    '/v1/payment-links',
    { preHandler: [auth, requirePermission('payments.links:manage'), paymentCreationControl] },
    async (request, reply) => {
      const key = idempotencySchema.parse(request.headers['idempotency-key']);
      const prior = await db.query(
        `SELECT response_status,response_body FROM idempotency_keys WHERE merchant_id=$1 AND operation='create-link' AND key=$2`,
        [request.actor!.merchantId, key],
      );
      if (prior.rowCount)
        return reply.code(prior.rows[0].response_status).send(prior.rows[0].response_body);
      const b = createLinkSchema.parse(request.body);
      const id = newId('plink'),
        token = newToken();
      const r = await db.query(
        `INSERT INTO payment_links(id,merchant_id,token,name,mode,amount_minor,currency,description,customer_reference,reusable,max_successful_payments,redirect_url,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          id,
          request.actor!.merchantId,
          token,
          b.name,
          b.mode,
          b.amountMinor ?? null,
          b.currency,
          b.description ?? null,
          b.customerReference ?? null,
          b.reusable,
          b.maxSuccessfulPayments ?? null,
          b.redirectUrl ?? null,
          b.expiresAt ?? null,
        ],
      );
      const body = link(r.rows[0], config.FRONTEND_ORIGIN);
      await db.query(`INSERT INTO idempotency_keys VALUES($1,'create-link',$2,201,$3)`, [
        request.actor!.merchantId,
        key,
        body,
      ]);
      return reply.code(201).send(body);
    },
  );
  app.get(
    '/v1/payment-links/:id',
    { preHandler: [auth, requirePermission('payments.links:manage')] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const r = await db.query('SELECT * FROM payment_links WHERE id=$1 AND merchant_id=$2', [
        id,
        request.actor!.merchantId,
      ]);
      return r.rowCount
        ? link(r.rows[0], config.FRONTEND_ORIGIN)
        : reply.code(404).send(apiError(request, 'NOT_FOUND', 'Payment link not found.'));
    },
  );
  app.patch(
    '/v1/payment-links/:id',
    { preHandler: [auth, requirePermission('payments.links:manage')] },
    async (request, reply) => {
      z.object({ status: z.literal('DISABLED') }).parse(request.body);
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const r = await db.query(
        `UPDATE payment_links SET status='DISABLED' WHERE id=$1 AND merchant_id=$2 RETURNING *`,
        [id, request.actor!.merchantId],
      );
      return r.rowCount
        ? link(r.rows[0], config.FRONTEND_ORIGIN)
        : reply.code(404).send(apiError(request, 'NOT_FOUND', 'Payment link not found.'));
    },
  );

  app.get('/v1/checkout/:token', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.params);
    const r = await db.query(
      `SELECT l.*,m.name merchant_name FROM payment_links l JOIN merchants m ON m.id=l.merchant_id WHERE token=$1`,
      [token],
    );
    if (!r.rowCount)
      return reply.code(404).send(apiError(request, 'NOT_FOUND', 'This checkout link is invalid.'));
    const x = r.rows[0];
    const expired = x.status !== 'ACTIVE' || (x.expires_at && new Date(x.expires_at) < new Date());
    return {
      token: x.token,
      reference: `LINK-${x.id}`,
      merchantDisplayName: x.merchant_name,
      description: x.description,
      merchantReference: x.customer_reference,
      amount: money(x.amount_minor, x.currency),
      availableChannels: ['MOBILE_MONEY', 'CARD', 'BANK_TRANSFER'],
      requiredCustomerFields: ['name', 'phone'],
      status: expired ? 'EXPIRED' : 'READY',
      expiresAt: x.expires_at ?? new Date(Date.now() + 900000).toISOString(),
    };
  });
  app.post(
    '/v1/checkout/:token/submit',
    { preHandler: paymentCreationControl },
    async (request, reply) => {
      const key = idempotencySchema.parse(request.headers['idempotency-key']);
      const { token } = z.object({ token: z.string() }).parse(request.params);
      const body = z
        .object({
          channel: z.enum(['MOBILE_MONEY', 'CARD', 'BANK_TRANSFER']),
          customer: customerSchema.refine((x) => x.name && x.phone, {
            message: 'Name and phone are required.',
          }),
        })
        .parse(request.body);
      const linkResult = await db.query(
        `SELECT * FROM payment_links WHERE token=$1 AND status='ACTIVE' AND (expires_at IS NULL OR expires_at>now())`,
        [token],
      );
      if (!linkResult.rowCount)
        return reply
          .code(410)
          .send(apiError(request, 'EXPIRED', 'This payment session has expired.'));
      const paymentLink = linkResult.rows[0];
      const response = await transaction(db, async (client) => {
        const prior = await client.query(
          `SELECT response_body FROM idempotency_keys WHERE merchant_id=$1 AND operation='checkout' AND key=$2 FOR UPDATE`,
          [paymentLink.merchant_id, key],
        );
        if (prior.rowCount) return prior.rows[0].response_body as { reference: string };
        const id = newId('pay');
        const reference = `GP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const fee = Math.round(Number(paymentLink.amount_minor) * 0.018);
        const initiated = await provider.initiatePayment({
          paymentReference: reference,
          amountMinor: Number(paymentLink.amount_minor),
          currency: paymentLink.currency,
          channel: body.channel,
          customer: body.customer,
        });
        await client.query(
          `INSERT INTO payments(id,merchant_id,payment_link_id,reference,merchant_reference,description,status,channel,provider_name,gross_minor,fee_minor,currency,customer,provider_submitted_at) VALUES($1,$2,$3,$4,$5,$6,'CREATED',$7,$8,$9,$10,$11,$12,now())`,
          [
            id,
            paymentLink.merchant_id,
            paymentLink.id,
            reference,
            paymentLink.customer_reference,
            paymentLink.description,
            body.channel,
            provider.name,
            paymentLink.amount_minor,
            fee,
            paymentLink.currency,
            body.customer,
          ],
        );
        await client.query(
          `INSERT INTO payment_attempts(id,payment_id,provider,provider_payment_id,status) VALUES($1,$2,$3,$4,$5)`,
          [newId('pat'), id, provider.name, initiated.providerPaymentId, initiated.status],
        );
        await client.query(`UPDATE payments SET status=$1,updated_at=now() WHERE id=$2`, [
          initiated.status,
          id,
        ]);
        await client.query(
          `INSERT INTO payment_events(id,payment_id,type,label) VALUES($1,$2,'PAYMENT_CREATED','Payment created'),($3,$2,'PROVIDER_REQUEST_ACCEPTED','Provider accepted request')`,
          [newId('evt'), id, newId('evt')],
        );
        const result = { reference };
        await client.query(`INSERT INTO idempotency_keys VALUES($1,'checkout',$2,202,$3)`, [
          paymentLink.merchant_id,
          key,
          result,
        ]);
        return result;
      });
      return reply.code(202).send(response);
    },
  );
  app.get('/v1/payment-status/:reference', async (request, reply) => {
    const { reference } = z.object({ reference: z.string() }).parse(request.params);
    const r = await db.query(
      `SELECT p.*,m.name merchant_name FROM payments p JOIN merchants m ON m.id=p.merchant_id WHERE reference=$1`,
      [reference],
    );
    if (!r.rowCount)
      return reply.code(404).send(apiError(request, 'NOT_FOUND', 'Unknown payment reference.'));
    const x = r.rows[0];
    return {
      reference: x.reference,
      status: x.status === 'SUCCEEDED' ? 'SUCCESS' : x.status,
      amount: money(x.gross_minor, x.currency),
      merchantDisplayName: x.merchant_name,
      merchantReference: x.merchant_reference,
      confirmedAt: x.status === 'SUCCEEDED' ? x.updated_at : null,
    };
  });

  app.post(
    '/v1/webhooks/providers/sandbox',
    { bodyLimit: 64 * 1024, preHandler: operationalControlGuard(db, 'WEBHOOK_DELIVERY_PAUSED') },
    async (request, reply) => {
      const rawBody = request.rawWebhookBody ?? Buffer.alloc(0);
      let event;
      try {
        event = provider.parseAndVerifyWebhook(rawBody, {
          signature:
            typeof request.headers['x-giantpay-signature'] === 'string'
              ? request.headers['x-giantpay-signature']
              : undefined,
          timestamp:
            typeof request.headers['x-giantpay-timestamp'] === 'string'
              ? request.headers['x-giantpay-timestamp']
              : undefined,
        });
      } catch (error) {
        if (error instanceof WebhookVerificationError)
          return reply.code(error.statusCode).send(apiError(request, error.code, error.message));
        throw error;
      }
      const result = await processPaymentWebhook(db, provider.name, event, rawBody);
      if (result.outcome === 'PAYLOAD_CONFLICT')
        return reply
          .code(409)
          .send(
            apiError(
              request,
              'WEBHOOK_REPLAY_CONFLICT',
              'Webhook event conflicts with a previous delivery.',
            ),
          );
      if (result.outcome === 'UNKNOWN_PAYMENT')
        return reply
          .code(404)
          .send(apiError(request, 'UNKNOWN_PAYMENT', 'Payment reference was not found.'));
      if (result.outcome === 'INVALID_TRANSITION')
        return reply
          .code(409)
          .send(
            apiError(
              request,
              'INVALID_PAYMENT_TRANSITION',
              'Payment status transition was rejected.',
            ),
          );
      return reply.code(202).send({ accepted: true, duplicate: result.outcome === 'DUPLICATE' });
    },
  );

  const refundJoin = `SELECT r.*,p.reference payment_reference,p.currency,ru.name requested_by_name,au.name approved_by_name,du.name decided_by_name FROM refunds r JOIN payments p ON p.id=r.payment_id JOIN users ru ON ru.id=r.requested_by LEFT JOIN users au ON au.id=r.approved_by LEFT JOIN users du ON du.id=r.decided_by`;
  app.get(
    '/v1/refunds',
    { preHandler: [auth, requirePermission('payments.refunds:request')] },
    async (request) => {
      const q = pageSchema.extend({ status: z.string().optional() }).parse(request.query);
      const vals: any[] = [request.actor!.merchantId];
      let clause = 'r.merchant_id=$1';
      if (q.status) {
        vals.push(q.status.split(','));
        clause += ` AND r.status=ANY($2)`;
      }
      const total = await db.query(`SELECT count(*) FROM refunds r WHERE ${clause}`, vals);
      vals.push(q.pageSize, (q.page - 1) * q.pageSize);
      const rows = await db.query(
        `${refundJoin} WHERE ${clause} ORDER BY r.created_at DESC LIMIT $${vals.length - 1} OFFSET $${vals.length}`,
        vals,
      );
      return {
        data: rows.rows.map(refund),
        page: q.page,
        pageSize: q.pageSize,
        total: Number(total.rows[0].count),
      };
    },
  );
  app.post(
    '/v1/refunds',
    { preHandler: [auth, requirePermission('payments.refunds:request'), refundMutationControl] },
    async (request, reply) => {
      const key = idempotencySchema.parse(request.headers['idempotency-key']);
      const b = z
        .object({
          paymentId: z.string(),
          amountMinor: z.number().int().positive(),
          reason: z.string().trim().min(3),
        })
        .parse(request.body);
      return transaction(db, async (client) => {
        const p = await client.query(
          'SELECT * FROM payments WHERE id=$1 AND merchant_id=$2 FOR UPDATE',
          [b.paymentId, request.actor!.merchantId],
        );
        if (!p.rowCount) {
          reply.code(404);
          return apiError(request, 'NOT_FOUND', 'Payment not found.');
        }
        if (b.amountMinor > Number(p.rows[0].gross_minor) - Number(p.rows[0].refunded_minor)) {
          reply.code(422);
          return apiError(
            request,
            'AMOUNT_EXCEEDS_REFUNDABLE',
            'Refund amount exceeds the refundable balance.',
          );
        }
        const prior = await client.query(
          `SELECT response_status,response_body FROM idempotency_keys WHERE merchant_id=$1 AND operation='refund' AND key=$2 FOR UPDATE`,
          [request.actor!.merchantId, key],
        );
        if (prior.rowCount) {
          reply.code(prior.rows[0].response_status);
          return prior.rows[0].response_body;
        }
        const id = newId('ref'),
          reference = `RF-${Date.now()}`;
        await client.query(
          `INSERT INTO refunds(id,merchant_id,payment_id,reference,amount_minor,reason,status,requested_by) VALUES($1,$2,$3,$4,$5,$6,'PENDING_APPROVAL',$7)`,
          [
            id,
            request.actor!.merchantId,
            b.paymentId,
            reference,
            b.amountMinor,
            b.reason,
            request.actor!.id,
          ],
        );
        const row = await client.query(`${refundJoin} WHERE r.id=$1`, [id]);
        const body = refund(row.rows[0]);
        await client.query(`INSERT INTO idempotency_keys VALUES($1,'refund',$2,201,$3)`, [
          request.actor!.merchantId,
          key,
          body,
        ]);
        await client.query(
          `INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,deduplication_key) VALUES($1,'refund.pending_approval','refund',$2,$3,$4)`,
          [
            newId('obx'),
            id,
            {
              merchantId: request.actor!.merchantId,
              refundId: id,
              paymentId: b.paymentId,
              amountMinor: b.amountMinor,
            },
            `refund.pending_approval:${id}`,
          ],
        );
        reply.code(201);
        return body;
      });
    },
  );
  app.get(
    '/v1/refunds/:id',
    { preHandler: [auth, requirePermission('payments.refunds:request')] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const r = await db.query(`${refundJoin} WHERE r.id=$1 AND r.merchant_id=$2`, [
        id,
        request.actor!.merchantId,
      ]);
      return r.rowCount
        ? refund(r.rows[0])
        : reply.code(404).send(apiError(request, 'NOT_FOUND', 'Refund not found.'));
    },
  );

  app.get(
    '/v1/admin/refunds/pending',
    { preHandler: [auth, requirePermission('admin.refunds:approve')] },
    async (request) => {
      const q = pageSchema.parse(request.query);
      const total = await db.query(`SELECT count(*) FROM refunds WHERE status='PENDING_APPROVAL'`);
      const rows = await db.query(
        `${refundJoin} WHERE r.status='PENDING_APPROVAL' ORDER BY r.created_at LIMIT $1 OFFSET $2`,
        [q.pageSize, (q.page - 1) * q.pageSize],
      );
      return {
        data: rows.rows.map(refund),
        page: q.page,
        pageSize: q.pageSize,
        total: Number(total.rows[0].count),
      };
    },
  );
  app.post(
    '/v1/admin/refunds/:id/decision',
    { preHandler: [auth, requirePermission('admin.refunds:approve'), refundMutationControl] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const body = z
        .object({
          decision: z.enum(['APPROVE', 'REJECT']),
          note: z.string().trim().min(3).max(500),
        })
        .parse(request.body);
      try {
        return await transaction(db, async (client) => {
          const locked = await client.query(`SELECT * FROM refunds WHERE id=$1 FOR UPDATE`, [id]);
          if (!locked.rowCount) {
            reply.code(404);
            return apiError(request, 'NOT_FOUND', 'Refund not found.');
          }
          const next = decideRefundState(locked.rows[0], request.actor!.id, body.decision);
          await client.query(
            `UPDATE refunds SET status=$1,approved_by=$2,decided_by=$3,decision_note=$4,decided_at=now(),updated_at=now() WHERE id=$5`,
            [next.status, next.approvedBy, next.decidedBy, body.note, id],
          );
          await client.query(
            `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,$4,'refund',$5,$6)`,
            [
              newId('aud'),
              request.actor!.id,
              locked.rows[0].merchant_id,
              `REFUND_${next.status}`,
              id,
              { note: body.note },
            ],
          );
          await client.query(
            `INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,deduplication_key) VALUES($1,$2,'refund',$3,$4,$5)`,
            [
              newId('obx'),
              next.status === 'APPROVED' ? 'refund.approved' : 'refund.rejected',
              id,
              {
                merchantId: locked.rows[0].merchant_id,
                refundId: id,
                paymentId: locked.rows[0].payment_id,
                status: next.status,
              },
              `refund.${next.status.toLowerCase()}:${id}`,
            ],
          );
          const result = await client.query(`${refundJoin} WHERE r.id=$1`, [id]);
          return refund(result.rows[0]);
        });
      } catch (error) {
        if (error instanceof RefundDecisionError)
          return reply.code(error.statusCode).send(apiError(request, error.code, error.message));
        throw error;
      }
    },
  );

  const ledgerFilters = pageSchema
    .extend({
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .optional(),
      from: z.iso.datetime().optional(),
      to: z.iso.datetime().optional(),
    })
    .refine((value) => !value.from || !value.to || value.from <= value.to, {
      message: 'The date range is invalid.',
      path: ['from'],
    });
  app.get(
    '/v1/ledger/entries',
    { preHandler: [auth, requirePermission('ledger:read')] },
    async (request) => {
      const query = ledgerFilters.parse(request.query);
      const values: unknown[] = [request.actor!.merchantId];
      const where = ['e.merchant_id=$1'];
      if (query.currency) {
        values.push(query.currency);
        where.push(
          `EXISTS(SELECT 1 FROM journal_postings p WHERE p.entry_id=e.id AND p.currency=$${values.length})`,
        );
      }
      if (query.from) {
        values.push(query.from);
        where.push(`e.posted_at>=$${values.length}`);
      }
      if (query.to) {
        values.push(query.to);
        where.push(`e.posted_at<=$${values.length}`);
      }
      const total = await db.query(
        `SELECT count(*) FROM journal_entries e WHERE ${where.join(' AND ')}`,
        values,
      );
      values.push(query.pageSize, (query.page - 1) * query.pageSize);
      const entries = await db.query(
        `SELECT e.id,e.source_type "sourceType",e.source_id "sourceId",e.description,e.reversed_entry_id "reversedEntryId",e.reversal_reason "reversalReason",e.posted_at "postedAt"
       FROM journal_entries e WHERE ${where.join(' AND ')} ORDER BY e.posted_at DESC,e.id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      return {
        data: entries.rows,
        page: query.page,
        pageSize: query.pageSize,
        total: Number(total.rows[0].count),
      };
    },
  );
  app.get(
    '/v1/ledger/entries/:id',
    { preHandler: [auth, requirePermission('ledger:read')] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
      const entry = await db.query(
        `SELECT id,source_type "sourceType",source_id "sourceId",description,reversed_entry_id "reversedEntryId",reversal_reason "reversalReason",posted_at "postedAt"
       FROM journal_entries WHERE id=$1 AND merchant_id=$2`,
        [id, request.actor!.merchantId],
      );
      if (!entry.rowCount)
        return reply
          .code(404)
          .send(apiError(request, 'LEDGER_ENTRY_NOT_FOUND', 'Ledger entry was not found.'));
      const postings = await db.query(
        `SELECT p.id,a.code "accountCode",a.name "accountName",p.direction,p.amount_minor "amountMinor",p.currency
       FROM journal_postings p JOIN ledger_accounts a ON a.id=p.account_id
       WHERE p.entry_id=$1 AND a.owner_type='MERCHANT' AND a.merchant_id=$2 ORDER BY p.id`,
        [id, request.actor!.merchantId],
      );
      return {
        ...entry.rows[0],
        postings: postings.rows.map((row: any) => ({
          ...row,
          amountMinor: Number(row.amountMinor),
        })),
      };
    },
  );
  app.get(
    '/v1/ledger/balances',
    { preHandler: [auth, requirePermission('ledger:read')] },
    async (request) => {
      const { currency } = z
        .object({
          currency: z
            .string()
            .regex(/^[A-Z]{3}$/)
            .optional(),
        })
        .parse(request.query);
      const result = await db.query(
        `SELECT a.code "accountCode",a.name "accountName",a.currency,
       coalesce(sum(CASE p.direction WHEN 'CREDIT' THEN p.amount_minor ELSE -p.amount_minor END),0) "balanceMinor"
       FROM ledger_accounts a LEFT JOIN journal_postings p ON p.account_id=a.id
       WHERE a.owner_type='MERCHANT' AND a.merchant_id=$1 AND ($2::text IS NULL OR a.currency=$2)
       GROUP BY a.id ORDER BY a.currency,a.code`,
        [request.actor!.merchantId, currency ?? null],
      );
      return result.rows.map((row: any) => ({ ...row, balanceMinor: Number(row.balanceMinor) }));
    },
  );

  const range = z.object({ from: z.iso.datetime(), to: z.iso.datetime() });
  app.get(
    '/v1/dashboard/summary',
    { preHandler: [auth, requirePermission('payments:read')] },
    async (request) => {
      const q = range.parse(request.query);
      const r = await db.query(
        `SELECT count(*) FILTER(WHERE status IN('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED')) successful,count(*) FILTER(WHERE status IN('PENDING','PROCESSING')) pending,count(*) FILTER(WHERE status IN('FAILED','EXPIRED')) failed,coalesce(sum(gross_minor) FILTER(WHERE status IN('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED')),0) total,coalesce(sum(refunded_minor),0) refunded,coalesce(sum(fee_minor) FILTER(WHERE status IN('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED')),0) fees,count(*) all_count,count(*) FILTER(WHERE reconciliation_state='MATCHED') matched,count(*) FILTER(WHERE reconciliation_state='UNRECONCILED') unmatched,count(*) FILTER(WHERE reconciliation_state='EXCEPTION') exceptions,count(*) FILTER(WHERE settlement_state='PENDING') settlement_pending,count(*) FILTER(WHERE settlement_state='SETTLED') settled FROM payments WHERE merchant_id=$1 AND created_at BETWEEN $2 AND $3`,
        [request.actor!.merchantId, q.from, q.to],
      );
      const x = r.rows[0];
      const recent = await db.query(
        `SELECT id,reference,customer->>'name' "customerName",gross_minor "amountMinor",status,created_at "createdAt" FROM payments WHERE merchant_id=$1 ORDER BY created_at DESC LIMIT 8`,
        [request.actor!.merchantId],
      );
      return {
        environment: request.actor!.environment,
        currency: 'MWK',
        totalProcessed: { amountMinor: Number(x.total) },
        successfulCount: Number(x.successful),
        pendingCount: Number(x.pending),
        failedCount: Number(x.failed),
        refundedAmountMinor: Number(x.refunded),
        feesAmountMinor: Number(x.fees),
        successRate: Number(x.all_count) ? Number(x.successful) / Number(x.all_count) : 0,
        reconciliation: {
          matched: Number(x.matched),
          unmatched: Number(x.unmatched),
          exceptions: Number(x.exceptions),
        },
        settlements: {
          available: 0,
          pending: Number(x.settlement_pending),
          processing: 0,
          completed: Number(x.settled),
        },
        attentionQueue: [],
        recentTransactions: recent.rows.map((v: any) => ({
          ...v,
          amountMinor: Number(v.amountMinor),
        })),
      };
    },
  );
  app.get(
    '/v1/dashboard/volume',
    { preHandler: [auth, requirePermission('payments:read')] },
    async (request) => {
      const q = range.parse(request.query);
      const r = await db.query(
        `SELECT d::date::text date,coalesce(sum(gross_minor) FILTER(WHERE status='SUCCEEDED'),0) "volumeMinor",count(p.id) "transactionCount",coalesce(count(p.id) FILTER(WHERE status='SUCCEEDED')::float/nullif(count(p.id),0),0) "successRate" FROM generate_series($2::date,$3::date,'1 day') d LEFT JOIN payments p ON p.merchant_id=$1 AND p.created_at>=d AND p.created_at<d+interval '1 day' GROUP BY d ORDER BY d`,
        [request.actor!.merchantId, q.from, q.to],
      );
      return r.rows.map((x: any) => ({
        ...x,
        volumeMinor: Number(x.volumeMinor),
        transactionCount: Number(x.transactionCount),
        successRate: Number(x.successRate),
      }));
    },
  );

  return app;
}
