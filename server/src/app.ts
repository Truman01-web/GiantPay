import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import argon2 from 'argon2';
import { Readable } from 'node:stream';
import { z, ZodError } from 'zod';
import type { Db } from './db.js';
import { transaction } from './db.js';
import type { Config } from './config.js';
import { apiError, authenticate, newId, newToken, requirePermission, SESSION_COOKIE, tokenHash } from './security.js';
import { decideRefundState, RefundDecisionError } from './refundDecision.js';
import { createPaymentProvider } from './providers/index.js';
import type { PaymentProvider } from './providers/types.js';
import { WebhookVerificationError } from './providers/sandboxProvider.js';
import { processPaymentWebhook } from './payments/webhookProcessor.js';

declare module 'fastify' {
  interface FastifyRequest { rawWebhookBody?: Buffer }
}

class WebhookBodyTooLargeError extends Error {}

const pageSchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) });
const idempotencySchema = z.string().min(8).max(128);
const customerSchema = z.object({ name: z.string().trim().min(1).optional(), email: z.email().optional(), phone: z.string().regex(/^\+265[0-9]{9}$/).optional() });

function money(amountMinor: unknown, currency: string) { return { amountMinor: Number(amountMinor), currency }; }
function session(actor: NonNullable<import('./security.js').Actor>) {
  return { user: { id: actor.id, name: actor.name, email: actor.email, role: actor.role, permissions: actor.permissions, merchantId: actor.merchantId, merchantName: actor.merchantName, mfaEnabled: actor.mfaEnabled }, environment: actor.environment, environments: [actor.environment] };
}
function payment(row: any) {
  return { id: row.id, reference: row.reference, merchantReference: row.merchant_reference, description: row.description, status: row.status,
    channel: row.channel, providerName: row.provider_name, gross: money(row.gross_minor,row.currency), fee: money(row.fee_minor,row.currency), tax: money(row.tax_minor,row.currency),
    net: money(Number(row.gross_minor)-Number(row.fee_minor)-Number(row.tax_minor),row.currency), refundableAmountMinor: Number(row.gross_minor)-Number(row.refunded_minor),
    refundedAmountMinor: Number(row.refunded_minor), customer: row.customer, createdAt: row.created_at, updatedAt: row.updated_at, expiresAt: row.expires_at,
    reconciliationState: row.reconciliation_state, settlementState: row.settlement_state };
}
function link(row: any, origin: string) {
  return { id: row.id, name: row.name, mode: row.mode, amount: row.amount_minor == null ? null : money(row.amount_minor,row.currency), description: row.description,
    customerReference: row.customer_reference, status: row.status, reusable: row.reusable, maxSuccessfulPayments: row.max_successful_payments,
    successfulPaymentsCount: row.successful_payments_count, redirectUrl: row.redirect_url, expiresAt: row.expires_at, createdAt: row.created_at,
    url: `${origin}/checkout/${row.token}` };
}
function refund(row: any) {
  return { id: row.id, reference: row.reference, paymentId: row.payment_id, paymentReference: row.payment_reference,
    amount: money(row.amount_minor,row.currency), reason: row.reason, status: row.status,
    requestedBy: { id: row.requested_by, name: row.requested_by_name }, approvedBy: row.approved_by ? { id: row.approved_by, name: row.approved_by_name } : null,
    decidedBy: row.decided_by ? { id: row.decided_by, name: row.decided_by_name } : null, decisionNote: row.decision_note, decidedAt: row.decided_at,
    createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function buildApp(config: Config, db: Db, provider: PaymentProvider = createPaymentProvider(config)) {
  const app = Fastify({ logger: config.NODE_ENV !== 'test', trustProxy: true, bodyLimit: 1024 * 1024, genReqId: (req) => String(req.headers['x-request-id'] ?? newId('req')) });
  await app.register(cookie, { secret: config.COOKIE_SECRET });
  await app.register(cors, { origin: config.FRONTEND_ORIGIN, credentials: true, methods: ['GET','POST','PATCH','DELETE','OPTIONS'] });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
  app.decorateRequest('actor', null);
  app.decorateRequest('rawWebhookBody', undefined);
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
      return reply.code(413).send(apiError(request, 'PAYLOAD_TOO_LARGE', 'Webhook payload is too large.'));
    }
    if (error instanceof ZodError) {
      const fields = Object.fromEntries(error.issues.map((i) => [i.path.join('.') || 'request', i.message]));
      return reply.code(422).send(apiError(request, 'VALIDATION_ERROR', 'Check the highlighted fields.', fields));
    }
    request.log.error(error);
    return reply.code(500).send(apiError(request, 'INTERNAL_ERROR', 'Something went wrong.'));
  });

  app.get('/v1/health', async (_request, reply) => {
    try { await db.query('SELECT 1'); return { status: 'ok' }; }
    catch { return reply.code(503).send({ status: 'unavailable' }); }
  });

  const registerSchema = z.object({ businessName: z.string().trim().min(2), email: z.email(), password: z.string().min(12), phone: z.string().regex(/^\+265[0-9]{9}$/) });
  app.post('/v1/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const exists = await db.query('SELECT 1 FROM users WHERE lower(email)=lower($1)', [body.email]);
    if (exists.rowCount) return reply.code(202).send({ accepted: true });
    const merchantId = newId('mch'); const userId = newId('usr');
    const passwordHash = await argon2.hash(body.password + config.PASSWORD_PEPPER, { type: argon2.argon2id });
    await transaction(db, async (client) => {
      await client.query('INSERT INTO merchants(id,name) VALUES($1,$2)', [merchantId, body.businessName]);
      await client.query(`INSERT INTO users(id,merchant_id,name,email,password_hash,role,permissions) VALUES($1,$2,$3,$4,$5,'OWNER',$6)`, [userId,merchantId,body.businessName,body.email,passwordHash,['payments:read','payments.links:manage','payments.refunds:request','settings:manage']]);
    });
    return reply.code(202).send({ accepted: true });
  });
  app.post('/v1/auth/login', async (request, reply) => {
    const body = z.object({ email: z.email(), password: z.string().min(1), remember: z.boolean().optional() }).parse(request.body);
    const found = await db.query(`SELECT u.*,m.name merchant_name,m.environment FROM users u LEFT JOIN merchants m ON m.id=u.merchant_id WHERE lower(email)=lower($1)`, [body.email]);
    const user = found.rows[0];
    if (!user || (user.locked_until && new Date(user.locked_until) > new Date()) || !(await argon2.verify(user.password_hash, body.password + config.PASSWORD_PEPPER))) {
      if (user) await db.query(`UPDATE users SET failed_logins=failed_logins+1, locked_until=CASE WHEN failed_logins>=4 THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=$1`, [user.id]);
      return reply.code(user?.locked_until ? 423 : 401).send(apiError(request, 'INVALID_CREDENTIALS', 'That email or password is incorrect.'));
    }
    await db.query('UPDATE users SET failed_logins=0,locked_until=NULL WHERE id=$1', [user.id]);
    const token = newToken(); const hours = body.remember ? Math.min(config.SESSION_TTL_HOURS * 30, 720) : config.SESSION_TTL_HOURS;
    await db.query(`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+($3 || ' hours')::interval)`, [tokenHash(token),user.id,String(hours)]);
    reply.setCookie(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', secure: config.NODE_ENV === 'production', maxAge: hours * 3600 });
    const actor = { id:user.id,merchantId:user.merchant_id,name:user.name,email:user.email,role:user.role,permissions:user.permissions,mfaEnabled:user.mfa_enabled,merchantName:user.merchant_name,environment:user.environment ?? 'production' } as const;
    return { status: 'AUTHENTICATED', session: session(actor) };
  });
  app.get('/v1/auth/session', { preHandler: [authenticate.bind(null, db)] }, async (request) => ({ session: session(request.actor!) }));
  app.post('/v1/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]; if (token) await db.query('DELETE FROM sessions WHERE token_hash=$1',[tokenHash(token)]);
    reply.clearCookie(SESSION_COOKIE,{path:'/'}).code(204).send();
  });
  app.post('/v1/auth/password/forgot', async (_request, reply) => reply.code(202).send({ accepted: true }));
  app.post('/v1/auth/password/reset', async (request) => { z.object({token:z.string().min(1),password:z.string().min(12)}).parse(request.body); return {accepted:true}; });
  app.post('/v1/auth/email/verify', async (request) => { z.object({token:z.string().min(1)}).parse(request.body); return {verified:true}; });

  const auth = authenticate.bind(null, db);
  app.get('/v1/merchants/onboarding', { preHandler: [auth] }, async (request) => (await db.query('SELECT onboarding FROM merchants WHERE id=$1',[request.actor!.merchantId])).rows[0]?.onboarding);
  app.patch('/v1/merchants/onboarding', { preHandler: [auth] }, async (request, reply) => {
    const current = await db.query('SELECT onboarding FROM merchants WHERE id=$1 FOR UPDATE',[request.actor!.merchantId]);
    if (!current.rowCount) return reply.code(404).send(apiError(request,'NOT_FOUND','Merchant not found.'));
    const existing=current.rows[0].onboarding; if (!['DRAFT','INFORMATION_REQUIRED'].includes(existing.status)) return reply.code(409).send(apiError(request,'NOT_EDITABLE','This application can no longer be edited.'));
    const next={...existing,...z.record(z.string(),z.unknown()).parse(request.body)};
    await db.query('UPDATE merchants SET onboarding=$1 WHERE id=$2',[next,request.actor!.merchantId]); return next;
  });
  app.post('/v1/merchants/onboarding/submit', { preHandler: [auth] }, async (request, reply) => {
    const result=await db.query(`UPDATE merchants SET onboarding=jsonb_set(jsonb_set(onboarding,'{status}','"SUBMITTED"'),'{timeline}',coalesce(onboarding->'timeline','[]') || $1::jsonb) WHERE id=$2 AND onboarding->>'declarationAccepted'='true' RETURNING onboarding`,[JSON.stringify([{status:'SUBMITTED',occurredAt:new Date().toISOString()}]),request.actor!.merchantId]);
    if(!result.rowCount) return reply.code(422).send(apiError(request,'INCOMPLETE_APPLICATION','Complete the declaration before submitting.')); return result.rows[0].onboarding;
  });
  app.post('/v1/merchants/onboarding/documents',{preHandler:[auth]},async(request,reply)=>{ const part=await request.file(); if(!part) return reply.code(422).send(apiError(request,'FILE_REQUIRED','Select a file.')); let size=0; for await(const chunk of part.file) size+=chunk.length; return {id:newId('doc'),fileName:part.filename,sizeBytes:size}; });

  app.get('/v1/payments',{preHandler:[auth,requirePermission('payments:read')]},async(request)=>{
    const q=pageSchema.extend({search:z.string().max(100).optional(),status:z.string().optional(),channel:z.string().optional()}).parse(request.query); const offset=(q.page-1)*q.pageSize;
    const params:any[]=[request.actor!.merchantId]; const where=['merchant_id=$1'];
    if(q.search){params.push(`%${q.search}%`);where.push(`(reference ILIKE $${params.length} OR merchant_reference ILIKE $${params.length} OR customer->>'name' ILIKE $${params.length})`);}
    if(q.status){params.push(q.status.split(','));where.push(`status=ANY($${params.length})`);} if(q.channel){params.push(q.channel.split(','));where.push(`channel=ANY($${params.length})`);}
    const count=await db.query(`SELECT count(*) FROM payments WHERE ${where.join(' AND ')}`,params); params.push(q.pageSize,offset);
    const rows=await db.query(`SELECT * FROM payments WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,params);
    return {data:rows.rows.map((r:any)=>({id:r.id,reference:r.reference,merchantReference:r.merchant_reference,customerName:r.customer.name??null,amount:money(r.gross_minor,r.currency),channel:r.channel,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at})),page:q.page,pageSize:q.pageSize,total:Number(count.rows[0].count)};
  });
  app.get('/v1/payments/:id',{preHandler:[auth,requirePermission('payments:read')]},async(request,reply)=>{const {id}=z.object({id:z.string()}).parse(request.params);const r=await db.query('SELECT * FROM payments WHERE id=$1 AND merchant_id=$2',[id,request.actor!.merchantId]);return r.rowCount?payment(r.rows[0]):reply.code(404).send(apiError(request,'NOT_FOUND','Payment not found.'));});
  app.get('/v1/payments/:id/events',{preHandler:[auth,requirePermission('payments:read')]},async(request)=>{const {id}=z.object({id:z.string()}).parse(request.params);const r=await db.query(`SELECT e.id,e.type,e.label,e.detail,e.occurred_at "occurredAt" FROM payment_events e JOIN payments p ON p.id=e.payment_id WHERE e.payment_id=$1 AND p.merchant_id=$2 ORDER BY e.occurred_at`,[id,request.actor!.merchantId]);return r.rows;});

  const createLinkSchema=z.object({name:z.string().min(1),mode:z.enum(['FIXED','CUSTOMER_ENTERED']),amountMinor:z.number().int().positive().optional(),currency:z.string().regex(/^[A-Z]{3}$/),description:z.string().optional(),customerReference:z.string().optional(),expiresAt:z.iso.datetime().optional(),reusable:z.boolean(),maxSuccessfulPayments:z.number().int().positive().optional(),redirectUrl:z.url().optional()}).superRefine((v,c)=>{if(v.mode==='CUSTOMER_ENTERED')c.addIssue({code:'custom',message:'Customer-entered amounts are not supported yet.',path:['mode']});if(v.mode==='FIXED'&&!v.amountMinor)c.addIssue({code:'custom',message:'Amount is required.',path:['amountMinor']});});
  app.get('/v1/payment-links',{preHandler:[auth,requirePermission('payments.links:manage')]},async(request)=>{const q=pageSchema.extend({search:z.string().optional()}).parse(request.query);const values:any[]=[request.actor!.merchantId];let clause='merchant_id=$1';if(q.search){values.push(`%${q.search}%`);clause+=` AND name ILIKE $2`;}const total=await db.query(`SELECT count(*) FROM payment_links WHERE ${clause}`,values);values.push(q.pageSize,(q.page-1)*q.pageSize);const rows=await db.query(`SELECT * FROM payment_links WHERE ${clause} ORDER BY created_at DESC LIMIT $${values.length-1} OFFSET $${values.length}`,values);return {data:rows.rows.map((r:any)=>link(r,config.FRONTEND_ORIGIN)),page:q.page,pageSize:q.pageSize,total:Number(total.rows[0].count)};});
  app.post('/v1/payment-links',{preHandler:[auth,requirePermission('payments.links:manage')]},async(request,reply)=>{const key=idempotencySchema.parse(request.headers['idempotency-key']);const prior=await db.query(`SELECT response_status,response_body FROM idempotency_keys WHERE merchant_id=$1 AND operation='create-link' AND key=$2`,[request.actor!.merchantId,key]);if(prior.rowCount)return reply.code(prior.rows[0].response_status).send(prior.rows[0].response_body);const b=createLinkSchema.parse(request.body);const id=newId('plink'),token=newToken();const r=await db.query(`INSERT INTO payment_links(id,merchant_id,token,name,mode,amount_minor,currency,description,customer_reference,reusable,max_successful_payments,redirect_url,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,[id,request.actor!.merchantId,token,b.name,b.mode,b.amountMinor??null,b.currency,b.description??null,b.customerReference??null,b.reusable,b.maxSuccessfulPayments??null,b.redirectUrl??null,b.expiresAt??null]);const body=link(r.rows[0],config.FRONTEND_ORIGIN);await db.query(`INSERT INTO idempotency_keys VALUES($1,'create-link',$2,201,$3)`,[request.actor!.merchantId,key,body]);return reply.code(201).send(body);});
  app.get('/v1/payment-links/:id',{preHandler:[auth,requirePermission('payments.links:manage')]},async(request,reply)=>{const {id}=z.object({id:z.string()}).parse(request.params);const r=await db.query('SELECT * FROM payment_links WHERE id=$1 AND merchant_id=$2',[id,request.actor!.merchantId]);return r.rowCount?link(r.rows[0],config.FRONTEND_ORIGIN):reply.code(404).send(apiError(request,'NOT_FOUND','Payment link not found.'));});
  app.patch('/v1/payment-links/:id',{preHandler:[auth,requirePermission('payments.links:manage')]},async(request,reply)=>{z.object({status:z.literal('DISABLED')}).parse(request.body);const {id}=z.object({id:z.string()}).parse(request.params);const r=await db.query(`UPDATE payment_links SET status='DISABLED' WHERE id=$1 AND merchant_id=$2 RETURNING *`,[id,request.actor!.merchantId]);return r.rowCount?link(r.rows[0],config.FRONTEND_ORIGIN):reply.code(404).send(apiError(request,'NOT_FOUND','Payment link not found.'));});

  app.get('/v1/checkout/:token',async(request,reply)=>{const {token}=z.object({token:z.string()}).parse(request.params);const r=await db.query(`SELECT l.*,m.name merchant_name FROM payment_links l JOIN merchants m ON m.id=l.merchant_id WHERE token=$1`,[token]);if(!r.rowCount)return reply.code(404).send(apiError(request,'NOT_FOUND','This checkout link is invalid.'));const x=r.rows[0];const expired=x.status!=='ACTIVE'||(x.expires_at&&new Date(x.expires_at)<new Date());return {token:x.token,reference:`LINK-${x.id}`,merchantDisplayName:x.merchant_name,description:x.description,merchantReference:x.customer_reference,amount:money(x.amount_minor,x.currency),availableChannels:['MOBILE_MONEY','CARD','BANK_TRANSFER'],requiredCustomerFields:['name','phone'],status:expired?'EXPIRED':'READY',expiresAt:x.expires_at??new Date(Date.now()+900000).toISOString()};});
  app.post('/v1/checkout/:token/submit', async (request, reply) => {
    const key = idempotencySchema.parse(request.headers['idempotency-key']);
    const { token } = z.object({ token: z.string() }).parse(request.params);
    const body = z.object({ channel: z.enum(['MOBILE_MONEY','CARD','BANK_TRANSFER']), customer: customerSchema.refine((x) => x.name && x.phone, { message: 'Name and phone are required.' }) }).parse(request.body);
    const linkResult = await db.query(`SELECT * FROM payment_links WHERE token=$1 AND status='ACTIVE' AND (expires_at IS NULL OR expires_at>now())`, [token]);
    if (!linkResult.rowCount) return reply.code(410).send(apiError(request, 'EXPIRED', 'This payment session has expired.'));
    const paymentLink = linkResult.rows[0];
    const response = await transaction(db, async (client) => {
      const prior = await client.query(`SELECT response_body FROM idempotency_keys WHERE merchant_id=$1 AND operation='checkout' AND key=$2 FOR UPDATE`, [paymentLink.merchant_id, key]);
      if (prior.rowCount) return prior.rows[0].response_body as { reference: string };
      const id = newId('pay');
      const reference = `GP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const fee = Math.round(Number(paymentLink.amount_minor) * 0.018);
      const initiated = await provider.initiatePayment({ paymentReference: reference, amountMinor: Number(paymentLink.amount_minor), currency: paymentLink.currency, channel: body.channel, customer: body.customer });
      await client.query(`INSERT INTO payments(id,merchant_id,payment_link_id,reference,merchant_reference,description,status,channel,provider_name,gross_minor,fee_minor,currency,customer,provider_submitted_at) VALUES($1,$2,$3,$4,$5,$6,'CREATED',$7,$8,$9,$10,$11,$12,now())`, [id,paymentLink.merchant_id,paymentLink.id,reference,paymentLink.customer_reference,paymentLink.description,body.channel,provider.name,paymentLink.amount_minor,fee,paymentLink.currency,body.customer]);
      await client.query(`INSERT INTO payment_attempts(id,payment_id,provider,provider_payment_id,status) VALUES($1,$2,$3,$4,$5)`, [newId('pat'),id,provider.name,initiated.providerPaymentId,initiated.status]);
      await client.query(`UPDATE payments SET status=$1,updated_at=now() WHERE id=$2`, [initiated.status,id]);
      await client.query(`INSERT INTO payment_events(id,payment_id,type,label) VALUES($1,$2,'PAYMENT_CREATED','Payment created'),($3,$2,'PROVIDER_REQUEST_ACCEPTED','Provider accepted request')`, [newId('evt'),id,newId('evt')]);
      const result = { reference };
      await client.query(`INSERT INTO idempotency_keys VALUES($1,'checkout',$2,202,$3)`, [paymentLink.merchant_id,key,result]);
      return result;
    });
    return reply.code(202).send(response);
  });
  app.get('/v1/payment-status/:reference',async(request,reply)=>{const {reference}=z.object({reference:z.string()}).parse(request.params);const r=await db.query(`SELECT p.*,m.name merchant_name FROM payments p JOIN merchants m ON m.id=p.merchant_id WHERE reference=$1`,[reference]);if(!r.rowCount)return reply.code(404).send(apiError(request,'NOT_FOUND','Unknown payment reference.'));const x=r.rows[0];return {reference:x.reference,status:x.status==='SUCCEEDED'?'SUCCESS':x.status,amount:money(x.gross_minor,x.currency),merchantDisplayName:x.merchant_name,merchantReference:x.merchant_reference,confirmedAt:x.status==='SUCCEEDED'?x.updated_at:null};});

  app.post('/v1/webhooks/providers/sandbox', { bodyLimit: 64 * 1024 }, async (request, reply) => {
    const rawBody = request.rawWebhookBody ?? Buffer.alloc(0);
    let event;
    try {
      event = provider.parseAndVerifyWebhook(rawBody, {
        signature: typeof request.headers['x-giantpay-signature'] === 'string' ? request.headers['x-giantpay-signature'] : undefined,
        timestamp: typeof request.headers['x-giantpay-timestamp'] === 'string' ? request.headers['x-giantpay-timestamp'] : undefined,
      });
    } catch (error) {
      if (error instanceof WebhookVerificationError) return reply.code(error.statusCode).send(apiError(request, error.code, error.message));
      throw error;
    }
    const result = await processPaymentWebhook(db, provider.name, event, rawBody);
    if (result.outcome === 'PAYLOAD_CONFLICT') return reply.code(409).send(apiError(request, 'WEBHOOK_REPLAY_CONFLICT', 'Webhook event conflicts with a previous delivery.'));
    if (result.outcome === 'UNKNOWN_PAYMENT') return reply.code(404).send(apiError(request, 'UNKNOWN_PAYMENT', 'Payment reference was not found.'));
    if (result.outcome === 'INVALID_TRANSITION') return reply.code(409).send(apiError(request, 'INVALID_PAYMENT_TRANSITION', 'Payment status transition was rejected.'));
    return reply.code(202).send({ accepted: true, duplicate: result.outcome === 'DUPLICATE' });
  });

  const refundJoin=`SELECT r.*,p.reference payment_reference,p.currency,ru.name requested_by_name,au.name approved_by_name,du.name decided_by_name FROM refunds r JOIN payments p ON p.id=r.payment_id JOIN users ru ON ru.id=r.requested_by LEFT JOIN users au ON au.id=r.approved_by LEFT JOIN users du ON du.id=r.decided_by`;
  app.get('/v1/refunds',{preHandler:[auth,requirePermission('payments.refunds:request')]},async(request)=>{const q=pageSchema.extend({status:z.string().optional()}).parse(request.query);const vals:any[]=[request.actor!.merchantId];let clause='r.merchant_id=$1';if(q.status){vals.push(q.status.split(','));clause+=` AND r.status=ANY($2)`;}const total=await db.query(`SELECT count(*) FROM refunds r WHERE ${clause}`,vals);vals.push(q.pageSize,(q.page-1)*q.pageSize);const rows=await db.query(`${refundJoin} WHERE ${clause} ORDER BY r.created_at DESC LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);return {data:rows.rows.map(refund),page:q.page,pageSize:q.pageSize,total:Number(total.rows[0].count)};});
  app.post('/v1/refunds',{preHandler:[auth,requirePermission('payments.refunds:request')]},async(request,reply)=>{const key=idempotencySchema.parse(request.headers['idempotency-key']);const b=z.object({paymentId:z.string(),amountMinor:z.number().int().positive(),reason:z.string().trim().min(3)}).parse(request.body);const p=await db.query('SELECT * FROM payments WHERE id=$1 AND merchant_id=$2 FOR UPDATE',[b.paymentId,request.actor!.merchantId]);if(!p.rowCount)return reply.code(404).send(apiError(request,'NOT_FOUND','Payment not found.'));if(b.amountMinor>Number(p.rows[0].gross_minor)-Number(p.rows[0].refunded_minor))return reply.code(422).send(apiError(request,'AMOUNT_EXCEEDS_REFUNDABLE','Refund amount exceeds the refundable balance.'));const prior=await db.query(`SELECT response_status,response_body FROM idempotency_keys WHERE merchant_id=$1 AND operation='refund' AND key=$2`,[request.actor!.merchantId,key]);if(prior.rowCount)return reply.code(prior.rows[0].response_status).send(prior.rows[0].response_body);const id=newId('ref'),reference=`RF-${Date.now()}`;await db.query(`INSERT INTO refunds(id,merchant_id,payment_id,reference,amount_minor,reason,status,requested_by) VALUES($1,$2,$3,$4,$5,$6,'PENDING_APPROVAL',$7)`,[id,request.actor!.merchantId,b.paymentId,reference,b.amountMinor,b.reason,request.actor!.id]);const row=await db.query(`${refundJoin} WHERE r.id=$1`,[id]);const body=refund(row.rows[0]);await db.query(`INSERT INTO idempotency_keys VALUES($1,'refund',$2,201,$3)`,[request.actor!.merchantId,key,body]);return reply.code(201).send(body);});
  app.get('/v1/refunds/:id',{preHandler:[auth,requirePermission('payments.refunds:request')]},async(request,reply)=>{const {id}=z.object({id:z.string()}).parse(request.params);const r=await db.query(`${refundJoin} WHERE r.id=$1 AND r.merchant_id=$2`,[id,request.actor!.merchantId]);return r.rowCount?refund(r.rows[0]):reply.code(404).send(apiError(request,'NOT_FOUND','Refund not found.'));});

  app.get('/v1/admin/refunds/pending',{preHandler:[auth,requirePermission('admin.refunds:approve')]},async(request)=>{const q=pageSchema.parse(request.query);const total=await db.query(`SELECT count(*) FROM refunds WHERE status='PENDING_APPROVAL'`);const rows=await db.query(`${refundJoin} WHERE r.status='PENDING_APPROVAL' ORDER BY r.created_at LIMIT $1 OFFSET $2`,[q.pageSize,(q.page-1)*q.pageSize]);return {data:rows.rows.map(refund),page:q.page,pageSize:q.pageSize,total:Number(total.rows[0].count)};});
  app.post('/v1/admin/refunds/:id/decision',{preHandler:[auth,requirePermission('admin.refunds:approve')]},async(request,reply)=>{const {id}=z.object({id:z.string()}).parse(request.params);const body=z.object({decision:z.enum(['APPROVE','REJECT']),note:z.string().trim().min(3).max(500)}).parse(request.body);try{return await transaction(db,async(client)=>{const locked=await client.query(`SELECT * FROM refunds WHERE id=$1 FOR UPDATE`,[id]);if(!locked.rowCount){reply.code(404);return apiError(request,'NOT_FOUND','Refund not found.');}const next=decideRefundState(locked.rows[0],request.actor!.id,body.decision);await client.query(`UPDATE refunds SET status=$1,approved_by=$2,decided_by=$3,decision_note=$4,decided_at=now(),updated_at=now() WHERE id=$5`,[next.status,next.approvedBy,next.decidedBy,body.note,id]);await client.query(`INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,$4,'refund',$5,$6)`,[newId('aud'),request.actor!.id,locked.rows[0].merchant_id,`REFUND_${next.status}`,id,{note:body.note}]);const result=await client.query(`${refundJoin} WHERE r.id=$1`,[id]);return refund(result.rows[0]);});}catch(error){if(error instanceof RefundDecisionError)return reply.code(error.statusCode).send(apiError(request,error.code,error.message));throw error;}});

  const range=z.object({from:z.iso.datetime(),to:z.iso.datetime()});
  app.get('/v1/dashboard/summary',{preHandler:[auth,requirePermission('payments:read')]},async(request)=>{const q=range.parse(request.query);const r=await db.query(`SELECT count(*) FILTER(WHERE status IN('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED')) successful,count(*) FILTER(WHERE status IN('PENDING','PROCESSING')) pending,count(*) FILTER(WHERE status IN('FAILED','EXPIRED')) failed,coalesce(sum(gross_minor) FILTER(WHERE status IN('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED')),0) total,coalesce(sum(refunded_minor),0) refunded,coalesce(sum(fee_minor) FILTER(WHERE status IN('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED')),0) fees,count(*) all_count,count(*) FILTER(WHERE reconciliation_state='MATCHED') matched,count(*) FILTER(WHERE reconciliation_state='UNRECONCILED') unmatched,count(*) FILTER(WHERE reconciliation_state='EXCEPTION') exceptions,count(*) FILTER(WHERE settlement_state='PENDING') settlement_pending,count(*) FILTER(WHERE settlement_state='SETTLED') settled FROM payments WHERE merchant_id=$1 AND created_at BETWEEN $2 AND $3`,[request.actor!.merchantId,q.from,q.to]);const x=r.rows[0];const recent=await db.query(`SELECT id,reference,customer->>'name' "customerName",gross_minor "amountMinor",status,created_at "createdAt" FROM payments WHERE merchant_id=$1 ORDER BY created_at DESC LIMIT 8`,[request.actor!.merchantId]);return {environment:request.actor!.environment,currency:'MWK',totalProcessed:{amountMinor:Number(x.total)},successfulCount:Number(x.successful),pendingCount:Number(x.pending),failedCount:Number(x.failed),refundedAmountMinor:Number(x.refunded),feesAmountMinor:Number(x.fees),successRate:Number(x.all_count)?Number(x.successful)/Number(x.all_count):0,reconciliation:{matched:Number(x.matched),unmatched:Number(x.unmatched),exceptions:Number(x.exceptions)},settlements:{available:0,pending:Number(x.settlement_pending),processing:0,completed:Number(x.settled)},attentionQueue:[],recentTransactions:recent.rows.map((v:any)=>({...v,amountMinor:Number(v.amountMinor)}))};});
  app.get('/v1/dashboard/volume',{preHandler:[auth,requirePermission('payments:read')]},async(request)=>{const q=range.parse(request.query);const r=await db.query(`SELECT d::date::text date,coalesce(sum(gross_minor) FILTER(WHERE status='SUCCEEDED'),0) "volumeMinor",count(p.id) "transactionCount",coalesce(count(p.id) FILTER(WHERE status='SUCCEEDED')::float/nullif(count(p.id),0),0) "successRate" FROM generate_series($2::date,$3::date,'1 day') d LEFT JOIN payments p ON p.merchant_id=$1 AND p.created_at>=d AND p.created_at<d+interval '1 day' GROUP BY d ORDER BY d`,[request.actor!.merchantId,q.from,q.to]);return r.rows.map((x:any)=>({...x,volumeMinor:Number(x.volumeMinor),transactionCount:Number(x.transactionCount),successRate:Number(x.successRate)}));});

  return app;
}
