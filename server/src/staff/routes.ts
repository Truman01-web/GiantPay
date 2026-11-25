import argon2 from 'argon2';
import { createHash, randomInt } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Config } from '../config.js';
import type { Db } from '../db.js';
import { transaction } from '../db.js';
import { rateLimit, type RateLimitStore } from '../rateLimit.js';
import {
  apiError,
  authenticateStaff,
  newId,
  newToken,
  STAFF_CSRF_COOKIE,
  STAFF_SESSION_COOKIE,
  tokenHash,
} from '../security.js';
import { createSmtpSender, type SmtpSender } from '../smtpRegistrationOtp.js';
import { registrationOtpHmac, verifyRegistrationOtp, maskEmail } from '../registrationOtp.js';
import { isExactStaffEmail } from './profiles.js';

const DUMMY = '$argon2id$v=19$m=65536,t=3,p=4$YWJjZGVmZ2hpamtsbW5vcA$YuIh0YVN5xU7dyzPqj9xSRZVZbsUJPC2joN1qz5NqJE';
const MFA_TTL_SECONDS = 300;
const MFA_MAX_ATTEMPTS = 5;
const response = (u: any, config?: Config) => {
  const environment = config?.DEPLOYMENT_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
  return {
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      role: 'PLATFORM_ADMIN',
      permissions: u.permissions,
      merchantId: null,
      merchantName: null,
      mfaEnabled: true,
      staffProfile: u.staff_profile ?? u.staffProfile,
    },
    environment,
    environments: [environment],
  };
};
const cookieOptions = (config: Config, maxAge: number) => ({
  path: '/',
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: config.NODE_ENV === 'production' || config.COOKIE_SECURE === true,
  maxAge,
});

export async function registerStaffRoutes(
  app: FastifyInstance,
  config: Config,
  db: Db,
  limits: RateLimitStore,
  sender?: SmtpSender,
) {
  const sendEmail = sender ?? (config.EXTERNAL_DELIVERY_ENABLED ? createSmtpSender(config) : null);
  const generic = (request: any, reply: any) =>
    reply.code(401).send(apiError(request, 'INVALID_CREDENTIALS', 'That email or password is incorrect.'));

  app.post(
    '/v1/staff/auth/login',
    {
      preHandler: [
        rateLimit(limits, config, 'staff-login:ip', 8, 900, (r) => r.ip),
        rateLimit(limits, config, 'staff-login:identity', 5, 900, (r) => String((r.body as any)?.email ?? '')),
      ],
    },
    async (request, reply) => {
      const body = z.object({ email: z.email(), password: z.string().min(1) }).parse(request.body);
      const normalized = body.email.trim().toLowerCase();
      const user = (await db.query('SELECT * FROM users WHERE normalized_email=$1', [normalized])).rows[0];
      const valid = await argon2.verify(user?.password_hash ?? DUMMY, body.password + config.PASSWORD_PEPPER);
      if (
        !valid ||
        !user ||
        user.status !== 'ACTIVE' ||
        user.merchant_id !== null ||
        user.role !== 'PLATFORM_ADMIN' ||
        !user.staff_profile ||
        !isExactStaffEmail(normalized)
      ) return generic(request, reply);

      if (!sendEmail) {
        return reply.code(503).send(apiError(request, 'MFA_EMAIL_DELIVERY_UNAVAILABLE', 'Staff email verification is not configured.'));
      }

      const challengeId = newToken();
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
      const expiry = new Date(Date.now() + MFA_TTL_SECONDS * 1000);
      const digest = registrationOtpHmac(config, challengeId, code);
      await transaction(db, async (connection) => {
        await connection.query(
          `UPDATE authentication_challenges SET used_at=now(),email_otp_hmac=NULL
            WHERE user_id=$1 AND purpose='LOGIN' AND session_context='STAFF' AND used_at IS NULL`,
          [user.id],
        );
        await connection.query(
          `INSERT INTO authentication_challenges(id,user_id,purpose,session_context,expires_at,email_otp_hmac)
           VALUES($1,$2,'LOGIN','STAFF',$3,$4)`,
          [tokenHash(challengeId), user.id, expiry.toISOString(), digest],
        );
      });

      try {
        await sendEmail({
          to: user.email,
          subject: 'Your GiantPlus staff sign-in code',
          text: `Your GiantPlus staff sign-in code is ${code}. It expires in five minutes and can be used once. Do not share this code. If you did not try to sign in, ignore this email.`,
          html: `<h1>GiantPlus staff sign-in</h1><p>Your verification code is <strong>${code}</strong>.</p><p>It expires in five minutes and can be used once. Do not share this code.</p><p>If you did not try to sign in, ignore this email.</p>`,
        });
      } catch (error) {
        await db.query('UPDATE authentication_challenges SET used_at=now(),email_otp_hmac=NULL WHERE id=$1', [tokenHash(challengeId)]);
        const message = error instanceof Error ? error.message : '';
        const replyCode = message.match(/SMTP rejected command \((\d{3})\)/)?.[1];
        const failureClass = /timeout/i.test(message)
          ? 'timeout'
          : replyCode
            ? `smtp_${replyCode}`
            : error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
              ? `network_${error.code.slice(0, 32)}`
              : 'delivery_error';
        request.log.warn({ event: 'staff_email_mfa_delivery_failed', failureClass }, 'Staff MFA email delivery failed.');
        return reply.code(503).send(apiError(request, 'MFA_EMAIL_DELIVERY_FAILED', 'We could not send a sign-in code. Try again later.'));
      }

      return {
        status: 'MFA_REQUIRED',
        challengeId,
        expiresAt: expiry.toISOString(),
        maskedDestination: maskEmail(user.email),
        method: 'EMAIL',
      };
    },
  );

  app.post(
    '/v1/staff/auth/mfa/verify',
    {
      preHandler: [
        rateLimit(limits, config, 'staff-mfa:ip', 10, 900, (r) => r.ip),
        rateLimit(limits, config, 'staff-mfa:challenge', 5, 900, (r) => String((r.body as { challengeId?: string })?.challengeId ?? '')),
      ],
    },
    async (request, reply) => {
      const body = z.object({ challengeId: z.string().min(32), code: z.string().regex(/^\d{6}$/) }).parse(request.body);
      const result = await transaction(db, async (connection) => {
        const row = (
          await connection.query(
            `SELECT ch.id challenge_id,ch.email_otp_hmac,ch.attempt_count,ch.user_id,u.*
               FROM authentication_challenges ch JOIN users u ON u.id=ch.user_id
              WHERE ch.id=$1 AND ch.purpose='LOGIN' AND ch.session_context='STAFF'
                AND ch.used_at IS NULL AND ch.expires_at>now() AND ch.email_otp_hmac IS NOT NULL
                AND ch.attempt_count<$2 AND u.status='ACTIVE' AND u.staff_profile IS NOT NULL
              FOR UPDATE OF ch,u`,
            [tokenHash(body.challengeId), MFA_MAX_ATTEMPTS],
          )
        ).rows[0];
        if (!row || !isExactStaffEmail(row.normalized_email)) return null;
        if (!verifyRegistrationOtp(config, body.challengeId, body.code, row.email_otp_hmac)) {
          await connection.query(
            `UPDATE authentication_challenges SET attempt_count=attempt_count+1,
               used_at=CASE WHEN attempt_count+1 >= $1 THEN now() ELSE used_at END,
               email_otp_hmac=CASE WHEN attempt_count+1 >= $1 THEN NULL ELSE email_otp_hmac END
             WHERE id=$2`,
            [MFA_MAX_ATTEMPTS, row.challenge_id],
          );
          return null;
        }

        await connection.query('UPDATE authentication_challenges SET used_at=now(),email_otp_hmac=NULL WHERE id=$1', [row.challenge_id]);
        await connection.query('UPDATE users SET mfa_enabled=true,email_verified_at=coalesce(email_verified_at,now()) WHERE id=$1', [row.user_id]);
        const token = newToken();
        const csrf = newToken();
        await connection.query(
          `INSERT INTO sessions(token_hash,public_id,user_id,expires_at,absolute_expires_at,last_seen_at,mfa_verified_at,session_context)
           VALUES($1,$2,$3,now()+($4 || ' hours')::interval,now()+($5 || ' hours')::interval,now(),now(),'STAFF')`,
          [tokenHash(token), newId('ses'), row.user_id, String(Math.min(config.SESSION_TTL_HOURS, config.SESSION_ABSOLUTE_HOURS)), String(config.SESSION_ABSOLUTE_HOURS)],
        );
        return { row, token, csrf };
      });

      if (!result) return reply.code(401).send(apiError(request, 'INVALID_MFA_CODE', 'Verification failed. Request a new sign-in code and try again.'));
      const maxAge = Math.min(config.SESSION_TTL_HOURS, config.SESSION_ABSOLUTE_HOURS) * 3600;
      reply
        .setCookie(STAFF_SESSION_COOKIE, result.token, cookieOptions(config, maxAge))
        .setCookie(STAFF_CSRF_COOKIE, result.csrf, { ...cookieOptions(config, maxAge), httpOnly: false });
      return { status: 'AUTHENTICATED', session: response(result.row, config), csrfToken: result.csrf };
    },
  );

  app.get('/v1/staff/auth/session', { preHandler: [authenticateStaff.bind(null, db, config)] }, async (request, reply) => {
    const csrfToken = request.cookies[STAFF_CSRF_COOKIE] ?? newToken();
    if (!request.cookies[STAFF_CSRF_COOKIE]) {
      const maxAge = Math.min(config.SESSION_TTL_HOURS, config.SESSION_ABSOLUTE_HOURS) * 3600;
      reply.setCookie(STAFF_CSRF_COOKIE, csrfToken, { ...cookieOptions(config, maxAge), httpOnly: false });
    }
    return { session: response(request.actor, config), csrfToken };
  });
  app.post('/v1/staff/auth/logout', async (request, reply) => {
    const token = request.cookies[STAFF_SESSION_COOKIE];
    if (token) await db.query(`UPDATE sessions SET revoked_at=coalesce(revoked_at,now()) WHERE token_hash=$1 AND session_context='STAFF'`, [tokenHash(token)]);
    return reply.clearCookie(STAFF_SESSION_COOKIE, { path: '/' }).clearCookie(STAFF_CSRF_COOKIE, { path: '/' }).code(204).send();
  });
}
