import { createHash } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Config } from '../config.js';
import type { Db } from '../db.js';
import { transaction } from '../db.js';
import type { RateLimitStore } from '../rateLimit.js';
import { rateLimit } from '../rateLimit.js';
import {
  apiError,
  authenticateSessionOrApiKey,
  newId,
  newToken,
  requirePermission,
  requireSession,
  SESSION_COOKIE,
} from '../security.js';
import { decryptSecret, encryptSecret } from '../developer/webhookSecurity.js';
import {
  generateTotpSecret,
  normalizeEmail,
  PERMISSIONS,
  recoveryCodes,
  validatePermissions,
  verifyTotp,
} from './security.js';
const page = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  hash = (value: string) => createHash('sha256').update(value).digest('hex');
const viewRole = (x: any) => ({
  id: x.id,
  name: x.name,
  description: x.description,
  permissions: x.permissions,
  systemRole: x.system_role,
  status: x.status,
  createdAt: x.created_at,
  updatedAt: x.updated_at,
});
const viewInvite = (x: any) => ({
  id: x.id,
  email: x.normalized_email,
  roleId: x.role_id,
  role: x.role_name,
  status: x.status,
  expiresAt: x.expires_at,
  createdAt: x.created_at,
});
export const invitationResponse = (row: any, token: string, nodeEnvironment: string) =>
  nodeEnvironment === 'production' ? viewInvite(row) : { ...viewInvite(row), deliveryToken: token };
const viewMember = (x: any) => ({
  id: x.id,
  name: x.name,
  email: x.email,
  roleId: x.role_id,
  role: x.role_name,
  status: x.status,
  mfaEnabled: Boolean(x.mfa_enabled),
  lastLoginAt: x.last_login_at,
  createdAt: x.created_at,
});
async function ownerGuard(c: any, merchant: string, user: string) {
  await c.query('SELECT id FROM merchants WHERE id=$1 FOR UPDATE', [merchant]);
  const count = Number(
    (
      await c.query(
        `SELECT count(*) FROM user_role_assignments a JOIN merchant_roles r ON r.id=a.role_id JOIN users u ON u.id=a.user_id WHERE a.merchant_id=$1 AND r.normalized_name='owner' AND u.status='ACTIVE' AND u.id<>$2`,
        [merchant, user],
      )
    ).rows[0].count,
  );
  if (!count)
    throw Object.assign(new Error('The final active owner is protected.'), {
      code: 'FINAL_OWNER_PROTECTED',
    });
}
const sessionOnly = async (r: FastifyRequest, p: FastifyReply) => {
  return requireSession(r, p);
};
export async function registerTeamRoutes(
  app: FastifyInstance,
  config: Config,
  db: Db,
  limits: RateLimitStore,
) {
  const auth = authenticateSessionOrApiKey(db, config.PASSWORD_PEPPER, limits, config),
    teamRead = [auth, sessionOnly, requirePermission('team:read')],
    teamWrite = [auth, sessionOnly, requirePermission('team:manage')],
    roleRead = [auth, sessionOnly, requirePermission('roles:read')],
    roleWrite = [auth, sessionOnly, requirePermission('roles:manage')],
    self = [auth, sessionOnly, requirePermission('security:manage:self')];
  app.post(
    '/v1/auth/mfa/recovery',
    {
      preHandler: [
        rateLimit(limits, config, 'mfa-recovery', 5, 900, (r) =>
          String((r.body as any)?.challengeId ?? ''),
        ),
      ],
    },
    async (r, p) => {
      const b = z
          .object({ challengeId: z.string().min(32), recoveryCode: z.string().min(12) })
          .parse(r.body),
        result = await transaction(db, async (c) => {
          const x = await c.query(
            `SELECT ch.id challenge_id,ch.user_id,u.*,m.name merchant_name,m.environment,coalesce(mr.name,u.role) effective_role,coalesce(mr.permissions,u.permissions) effective_permissions FROM authentication_challenges ch JOIN users u ON u.id=ch.user_id LEFT JOIN merchants m ON m.id=u.merchant_id LEFT JOIN user_role_assignments a ON a.user_id=u.id LEFT JOIN merchant_roles mr ON mr.id=a.role_id WHERE ch.id=$1 AND ch.purpose='LOGIN' AND ch.used_at IS NULL AND ch.expires_at>now() AND u.status='ACTIVE' FOR UPDATE OF ch,u`,
            [hash(b.challengeId)],
          );
          if (!x.rowCount) return null;
          const u = x.rows[0],
            code = await c.query(
              `SELECT * FROM mfa_recovery_codes WHERE user_id=$1 AND code_hash=$2 AND used_at IS NULL FOR UPDATE`,
              [u.user_id, hash(b.recoveryCode)],
            );
          if (!code.rowCount) return null;
          await c.query('UPDATE mfa_recovery_codes SET used_at=now() WHERE id=$1', [
            code.rows[0].id,
          ]);
          await c.query('UPDATE authentication_challenges SET used_at=now() WHERE id=$1', [
            u.challenge_id,
          ]);
          const token = newToken(),
            csrf = newToken(),
            publicId = newId('ses');
          await c.query(
            `INSERT INTO sessions(token_hash,public_id,user_id,expires_at,absolute_expires_at,last_seen_at,mfa_verified_at) VALUES($1,$2,$3,now()+interval '12 hours',now()+interval '24 hours',now(),now())`,
            [hash(token), publicId, u.user_id],
          );
          await c.query(
            `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'MFA_RECOVERY_CODE_USED','user',$2)`,
            [newId('aud'), u.user_id, u.merchant_id],
          );
          return { u, token, csrf };
        });
      if (!result)
        return p.code(401).send(apiError(r, 'RECOVERY_CODE_INVALID', 'Verification failed.'));
      const secure = config.NODE_ENV === 'production' || config.COOKIE_SECURE === true;
      p.setCookie(SESSION_COOKIE, result.token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: 43200,
      }).setCookie('giantpay_csrf', result.csrf, {
        path: '/',
        httpOnly: false,
        sameSite: 'strict',
        secure,
        maxAge: 43200,
      });
      const u = result.u;
      return {
        status: 'AUTHENTICATED',
        session: {
          user: {
            id: u.user_id,
            name: u.name,
            email: u.email,
            role: u.effective_role,
            permissions: u.effective_permissions,
            merchantId: u.merchant_id,
            merchantName: u.merchant_name,
            mfaEnabled: true,
          },
          environment: u.environment ?? 'sandbox',
          environments: [u.environment ?? 'sandbox'],
        },
        csrfToken: result.csrf,
      };
    },
  );
  app.get('/v1/team/members', { preHandler: teamRead }, async (r) => {
    const q = page.parse(r.query),
      x = await db.query(
        `SELECT u.id,u.name,u.email,u.status,u.created_at,mr.id role_id,mr.name role_name,(mfa.verified_at IS NOT NULL) mfa_enabled,max(s.last_seen_at) last_login_at,count(*) OVER() total FROM users u LEFT JOIN user_role_assignments a ON a.user_id=u.id AND a.merchant_id=u.merchant_id LEFT JOIN merchant_roles mr ON mr.id=a.role_id LEFT JOIN mfa_enrollments mfa ON mfa.user_id=u.id LEFT JOIN sessions s ON s.user_id=u.id WHERE u.merchant_id=$1 GROUP BY u.id,mr.id,mr.name,mfa.verified_at ORDER BY u.name,u.id LIMIT $2 OFFSET $3`,
        [r.actor!.merchantId, q.pageSize, (q.page - 1) * q.pageSize],
      );
    return {
      items: x.rows.map(viewMember),
      total: Number(x.rows[0]?.total ?? 0),
      page: q.page,
      pageSize: q.pageSize,
    };
  });
  app.get('/v1/team/members/:id', { preHandler: teamRead }, async (r, p) => {
    const x = await db.query(
      `SELECT u.id,u.name,u.email,u.status,u.created_at,mr.id role_id,mr.name role_name,(mfa.verified_at IS NOT NULL) mfa_enabled,max(s.last_seen_at) last_login_at FROM users u LEFT JOIN user_role_assignments a ON a.user_id=u.id AND a.merchant_id=u.merchant_id LEFT JOIN merchant_roles mr ON mr.id=a.role_id LEFT JOIN mfa_enrollments mfa ON mfa.user_id=u.id LEFT JOIN sessions s ON s.user_id=u.id WHERE u.id=$1 AND u.merchant_id=$2 GROUP BY u.id,mr.id,mr.name,mfa.verified_at`,
      [(r.params as any).id, r.actor!.merchantId],
    );
    return x.rowCount
      ? viewMember(x.rows[0])
      : p.code(404).send(apiError(r, 'MEMBER_NOT_FOUND', 'Team member not found.'));
  });
  app.patch('/v1/team/members/:id/role', { preHandler: teamWrite }, async (r, p) => {
    const { roleId } = z.object({ roleId: z.string() }).parse(r.body);
    try {
      return await transaction(db, async (c) => {
        const member = (
            await c.query('SELECT * FROM users WHERE id=$1 AND merchant_id=$2 FOR UPDATE', [
              (r.params as any).id,
              r.actor!.merchantId,
            ])
          ).rows[0],
          role = (
            await c.query(
              `SELECT * FROM merchant_roles WHERE id=$1 AND merchant_id=$2 AND status='ACTIVE'`,
              [roleId, r.actor!.merchantId],
            )
          ).rows[0];
        if (!member) {
          p.code(404);
          return apiError(r, 'MEMBER_NOT_FOUND', 'Team member not found.');
        }
        if (!role) {
          p.code(422);
          return apiError(r, 'INVALID_ROLE', 'Role is invalid or archived.');
        }
        if (member.id === r.actor!.id && member.role === 'OWNER') {
          p.code(409);
          return apiError(
            r,
            'FINAL_OWNER_PROTECTED',
            'Owners cannot demote themselves through self service.',
          );
        }
        const current = await c.query(
          `SELECT mr.normalized_name FROM user_role_assignments a JOIN merchant_roles mr ON mr.id=a.role_id WHERE a.user_id=$1`,
          [member.id],
        );
        if (current.rows[0]?.normalized_name === 'owner' && role.normalized_name !== 'owner')
          await ownerGuard(c, r.actor!.merchantId!, member.id);
        await c.query(
          `INSERT INTO user_role_assignments(user_id,merchant_id,role_id,assigned_by) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET role_id=excluded.role_id,assigned_by=excluded.assigned_by,assigned_at=now()`,
          [member.id, r.actor!.merchantId, role.id, r.actor!.id],
        );
        await c.query(
          `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'MEMBER_ROLE_CHANGED','user',$4)`,
          [newId('aud'), r.actor!.id, r.actor!.merchantId, member.id],
        );
        return viewMember((await c.query(`SELECT u.id,u.name,u.email,u.status,u.created_at,mr.id role_id,mr.name role_name,(mfa.verified_at IS NOT NULL) mfa_enabled,max(s.last_seen_at) last_login_at FROM users u LEFT JOIN user_role_assignments a ON a.user_id=u.id LEFT JOIN merchant_roles mr ON mr.id=a.role_id LEFT JOIN mfa_enrollments mfa ON mfa.user_id=u.id LEFT JOIN sessions s ON s.user_id=u.id WHERE u.id=$1 GROUP BY u.id,mr.id,mr.name,mfa.verified_at`, [member.id])).rows[0]);
      });
    } catch (e: any) {
      if (e.code === 'FINAL_OWNER_PROTECTED')
        return p.code(409).send(apiError(r, e.code, e.message));
      throw e;
    }
  });
  for (const action of ['suspend', 'reactivate', 'remove'] as const)
    app.post(`/v1/team/members/:id/${action}`, { preHandler: teamWrite }, async (r, p) => {
      try {
        return await transaction(db, async (c) => {
          const id = (r.params as any).id,
            x = await c.query('SELECT * FROM users WHERE id=$1 AND merchant_id=$2 FOR UPDATE', [
              id,
              r.actor!.merchantId,
            ]);
          if (!x.rowCount) {
            p.code(404);
            return apiError(r, 'MEMBER_NOT_FOUND', 'Team member not found.');
          }
          const owner = await c.query(
            `SELECT 1 FROM user_role_assignments a JOIN merchant_roles mr ON mr.id=a.role_id WHERE a.user_id=$1 AND mr.normalized_name='owner'`,
            [id],
          );
          if (owner.rowCount && action !== 'reactivate')
            await ownerGuard(c, r.actor!.merchantId!, id);
          const status =
            action === 'reactivate' ? 'ACTIVE' : action === 'suspend' ? 'SUSPENDED' : 'REMOVED';
          await c.query('UPDATE users SET status=$1 WHERE id=$2', [status, id]);
          let revoked = 0;
          if (status !== 'ACTIVE')
            revoked =
              (
                await c.query(
                  'UPDATE sessions SET revoked_at=coalesce(revoked_at,now()) WHERE user_id=$1 AND revoked_at IS NULL',
                  [id],
                )
              ).rowCount ?? 0;
          const event =
            action === 'suspend'
              ? 'MEMBER_SUSPENDED'
              : action === 'reactivate'
                ? 'MEMBER_REACTIVATED'
                : 'MEMBER_REMOVED';
          await c.query(
            `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,$4,'user',$5,$6)`,
            [
              newId('aud'),
              r.actor!.id,
              r.actor!.merchantId,
              event,
              id,
              { revokedSessionCount: revoked },
            ],
          );
          return { id, status };
        });
      } catch (e: any) {
        if (
          e.code === 'FINAL_OWNER_PROTECTED' ||
          e.code === '23514' ||
          /final owner protected/i.test(String(e.message))
        )
          return p
            .code(409)
            .send(apiError(r, 'FINAL_OWNER_PROTECTED', 'The final active owner is protected.'));
        throw e;
      }
    });
  app.get('/v1/team/invitations', { preHandler: teamRead }, async (r) => {
    const q = page.parse(r.query),
      x = await db.query(
        `SELECT i.*,r.name role_name,count(*) OVER() total FROM team_invitations i JOIN merchant_roles r ON r.id=i.role_id AND r.merchant_id=i.merchant_id WHERE i.merchant_id=$1 AND i.status='PENDING' ORDER BY i.created_at DESC,i.id DESC LIMIT $2 OFFSET $3`,
        [r.actor!.merchantId, q.pageSize, (q.page - 1) * q.pageSize],
      );
    return {
      items: x.rows.map(viewInvite),
      total: Number(x.rows[0]?.total ?? 0),
      page: q.page,
      pageSize: q.pageSize,
    };
  });
  app.post('/v1/team/invitations', { preHandler: teamWrite }, async (r, p) => {
    const b = z.object({ email: z.string().trim().pipe(z.email()), roleId: z.string() }).parse(r.body),
      email = normalizeEmail(b.email),
      token = newToken();
    try {
      const row = await transaction(db, async (c) => {
        const role = await c.query(
          `SELECT name FROM merchant_roles WHERE id=$1 AND merchant_id=$2 AND status='ACTIVE'`,
          [b.roleId, r.actor!.merchantId],
        );
        if (!role.rowCount)
          throw Object.assign(new Error('Role is invalid.'), { code: 'INVALID_ROLE' });
        if (
          (
            await c.query(
              `SELECT 1 FROM users WHERE merchant_id=$1 AND normalized_email=$2 AND status<>'REMOVED'`,
              [r.actor!.merchantId, email],
            )
          ).rowCount
        )
          throw Object.assign(new Error('A member already uses this email.'), {
            code: 'DUPLICATE_PENDING_INVITATION',
          });
        const id = newId('inv'),
          created = (
            await c.query(
              `INSERT INTO team_invitations(id,merchant_id,normalized_email,role_id,invited_by,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '72 hours') RETURNING *`,
              [id, r.actor!.merchantId, email, b.roleId, r.actor!.id, hash(token)],
            )
          ).rows[0];
        await c.query(
          `INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,deduplication_key) VALUES($1,'team.invitation.created','team_invitation',$2,$3,$4)`,
          [
            newId('obx'),
            id,
            {
              merchantId: r.actor!.merchantId,
              invitationId: id,
              email,
              tokenCiphertext: encryptSecret(
                token,
                config.WEBHOOK_SECRET_KEY ?? config.COOKIE_SECRET,
              ),
            },
            `team.invitation:${id}`,
          ],
        );
        await c.query(
          `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'INVITATION_CREATED','team_invitation',$4)`,
          [newId('aud'), r.actor!.id, r.actor!.merchantId, id],
        );
        return { ...created, role_name: role.rows[0].name };
      });
      p.code(201);
      return invitationResponse(row, token, config.NODE_ENV);
    } catch (e: any) {
      if (e.code === '23505' || e.code === 'DUPLICATE_PENDING_INVITATION')
        return p
          .code(409)
          .send(
            apiError(r, 'DUPLICATE_PENDING_INVITATION', 'A pending invitation already exists.'),
          );
      if (e.code === 'INVALID_ROLE')
        return p.code(422).send(apiError(r, 'INVALID_ROLE', e.message));
      throw e;
    }
  });
  app.post('/v1/team/invitations/:id/cancel', { preHandler: teamWrite }, async (r, p) => {
    const result = await transaction(db, async (c) => {
      const x = await c.query(
        `SELECT i.*,r.name role_name FROM team_invitations i JOIN merchant_roles r ON r.id=i.role_id AND r.merchant_id=i.merchant_id WHERE i.id=$1 AND i.merchant_id=$2 FOR UPDATE OF i`,
        [(r.params as any).id, r.actor!.merchantId],
      );
      if (!x.rowCount) return null;
      if (x.rows[0].status === 'CANCELLED') return x.rows[0];
      if (x.rows[0].status !== 'PENDING') return { conflict: true };
      const changed = (
        await c.query(
          `UPDATE team_invitations SET status='CANCELLED',cancelled_at=now() WHERE id=$1 RETURNING *`,
          [x.rows[0].id],
        )
      ).rows[0];
      await c.query(
        `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'INVITATION_CANCELLED','team_invitation',$4)`,
        [newId('aud'), r.actor!.id, r.actor!.merchantId, changed.id],
      );
      return { ...changed, role_name: x.rows[0].role_name };
    });
    return !result
      ? p.code(404).send(apiError(r, 'INVITATION_NOT_FOUND', 'Invitation not found.'))
      : 'conflict' in result
        ? p
            .code(409)
            .send(apiError(r, 'INVITATION_ALREADY_USED', 'Invitation cannot be cancelled.'))
        : viewInvite(result);
  });
  app.post('/v1/team/invitations/:id/resend', { preHandler: teamWrite }, async (r, p) => {
    const token = newToken();
    const row = await transaction(db, async (c) => {
      const x = await c.query(
        `SELECT i.*,r.name role_name FROM team_invitations i JOIN merchant_roles r ON r.id=i.role_id AND r.merchant_id=i.merchant_id WHERE i.id=$1 AND i.merchant_id=$2 FOR UPDATE OF i`,
        [(r.params as any).id, r.actor!.merchantId],
      );
      if (!x.rowCount) return { error: 'NOT_FOUND' };
      if (x.rows[0].status !== 'PENDING') return { error: 'CONFLICT' };
      const changed = (
        await c.query(
          `UPDATE team_invitations SET token_hash=$1,expires_at=now()+interval '72 hours' WHERE id=$2 RETURNING *`,
          [hash(token), x.rows[0].id],
        )
      ).rows[0];
      await c.query(
        `INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,deduplication_key) VALUES($1,'team.invitation.resent','team_invitation',$2,$3,$4)`,
        [
          newId('obx'),
          changed.id,
          {
            merchantId: r.actor!.merchantId,
            invitationId: changed.id,
            email: changed.normalized_email,
            tokenCiphertext: encryptSecret(
              token,
              config.WEBHOOK_SECRET_KEY ?? config.COOKIE_SECRET,
            ),
          },
          `team.invitation.resend:${changed.id}:${changed.token_hash}`,
        ],
      );
      await c.query(
        `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'INVITATION_RESENT','team_invitation',$4)`,
        [newId('aud'), r.actor!.id, r.actor!.merchantId, changed.id],
      );
      return { row: { ...changed, role_name: x.rows[0].role_name } };
    });
    if ('error' in row)
      return row.error === 'NOT_FOUND'
        ? p.code(404).send(apiError(r, 'INVITATION_NOT_FOUND', 'Invitation not found.'))
        : p.code(409).send(apiError(r, 'INVITATION_ALREADY_USED', 'Invitation cannot be resent.'));
    return invitationResponse(row.row, token, config.NODE_ENV);
  });
  app.post('/v1/team/invitations/accept', async (r, p) => {
    const b = z.object({ token: z.string().min(32), email: z.string().trim().pipe(z.email()) }).parse(r.body),
      email = normalizeEmail(b.email);
    const result = await transaction(db, async (c) => {
      const x = await c.query(`SELECT * FROM team_invitations WHERE token_hash=$1 FOR UPDATE`, [
        hash(b.token),
      ]);
      if (!x.rowCount) return { error: 'INVALID' };
      const invitation = x.rows[0];
      if (invitation.status !== 'PENDING') return { error: 'USED' };
      if (new Date(invitation.expires_at) <= new Date()) {
        await c.query(`UPDATE team_invitations SET status='EXPIRED',expired_at=now() WHERE id=$1`, [
          invitation.id,
        ]);
        return { error: 'EXPIRED' };
      }
      if (invitation.normalized_email !== email) return { error: 'EMAIL' };
      const role = await c.query(
        `SELECT 1 FROM merchant_roles WHERE id=$1 AND merchant_id=$2 AND status='ACTIVE'`,
        [invitation.role_id, invitation.merchant_id],
      );
      if (!role.rowCount) return { error: 'ROLE' };
      const user = await c.query(`SELECT * FROM users WHERE normalized_email=$1 FOR UPDATE`, [
        email,
      ]);
      if (!user.rowCount || user.rows[0].merchant_id !== invitation.merchant_id)
        return { error: 'EMAIL' };
      await c.query(`UPDATE users SET status='ACTIVE' WHERE id=$1`, [user.rows[0].id]);
      await c.query(
        `INSERT INTO user_role_assignments(user_id,merchant_id,role_id,assigned_by) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET merchant_id=excluded.merchant_id,role_id=excluded.role_id,assigned_by=excluded.assigned_by,assigned_at=now()`,
        [user.rows[0].id, invitation.merchant_id, invitation.role_id, invitation.invited_by],
      );
      await c.query(
        `UPDATE team_invitations SET status='ACCEPTED',accepted_at=now(),accepted_by=$1 WHERE id=$2`,
        [user.rows[0].id, invitation.id],
      );
      await c.query(
        `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'INVITATION_ACCEPTED','team_invitation',$4)`,
        [newId('aud'), user.rows[0].id, invitation.merchant_id, invitation.id],
      );
      return { id: invitation.id, merchantId: invitation.merchant_id };
    });
    if ('error' in result) {
      const map: any = {
          INVALID: ['INVITATION_NOT_FOUND', 404],
          USED: ['INVITATION_ALREADY_USED', 409],
          EXPIRED: ['INVITATION_EXPIRED', 410],
          EMAIL: ['INVITATION_EMAIL_MISMATCH', 403],
          ROLE: ['ARCHIVED_ROLE', 422],
        },
        [code, status] = map[String(result.error)];
      return p.code(status).send(apiError(r, code, 'Invitation acceptance failed.'));
    }
    return { accepted: true, ...result };
  });
  app.get('/v1/roles', { preHandler: roleRead }, async (r) => {
    const x = await db.query(
      'SELECT * FROM merchant_roles WHERE merchant_id=$1 ORDER BY system_role DESC,name,id',
      [r.actor!.merchantId],
    );
    return { items: x.rows.map(viewRole), total: x.rowCount ?? 0 };
  });
  app.post('/v1/roles', { preHandler: roleWrite }, async (r, p) => {
    const b = z
      .object({
        name: z.string().trim().min(2).max(80),
        description: z.string().max(500).default(''),
        permissions: z.array(z.string()),
      })
      .parse(r.body);
    let permissions;
    try {
      permissions = validatePermissions(
        b.permissions,
        r.actor!.permissions,
        r.actor!.role.toLowerCase() === 'owner',
      );
    } catch {
      return p.code(422).send(apiError(r, 'UNKNOWN_PERMISSION', 'Role permissions are invalid.'));
    }
    try {
      const x = await transaction(db, async (c) => {
        const created = (
          await c.query(
            `INSERT INTO merchant_roles(id,merchant_id,name,normalized_name,description,permissions,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [newId('role'), r.actor!.merchantId, b.name, b.name.toLowerCase(), b.description, permissions, r.actor!.id],
          )
        ).rows[0];
        await c.query(
          `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'ROLE_CREATED','merchant_role',$4)`,
          [newId('aud'), r.actor!.id, r.actor!.merchantId, created.id],
        );
        return created;
      });
      p.code(201);
      return viewRole(x);
    } catch (error: any) {
      if (error.code === '23505') return p.code(409).send(apiError(r, 'ROLE_NAME_EXISTS', 'A role with this name already exists.'));
      throw error;
    }
  });
  app.patch('/v1/roles/:id', { preHandler: roleWrite }, async (r, p) => {
    const b = z
      .object({
        name: z.string().trim().min(2).max(80).optional(),
        description: z.string().max(500).optional(),
        permissions: z.array(z.string()).optional(),
      })
      .refine((v) => Object.keys(v).length > 0)
      .parse(r.body);
    let permissions;
    try {
      permissions = b.permissions
        ? validatePermissions(
            b.permissions,
            r.actor!.permissions,
            r.actor!.role.toLowerCase() === 'owner',
          )
        : undefined;
    } catch {
      return p.code(422).send(apiError(r, 'UNKNOWN_PERMISSION', 'Role permissions are invalid.'));
    }
    let row;
    try {
      row = await transaction(db, async (c) => {
      const x = await c.query(
        'SELECT * FROM merchant_roles WHERE id=$1 AND merchant_id=$2 FOR UPDATE',
        [(r.params as any).id, r.actor!.merchantId],
      );
      if (!x.rowCount) return null;
      if (x.rows[0].system_role) return { system: true };
      const changed = (
        await c.query(
          `UPDATE merchant_roles SET name=coalesce($1,name),normalized_name=coalesce($2,normalized_name),description=coalesce($3,description),permissions=coalesce($4,permissions),updated_by=$5,updated_at=now() WHERE id=$6 RETURNING *`,
          [
            b.name ?? null,
            b.name?.toLowerCase() ?? null,
            b.description ?? null,
            permissions ?? null,
            r.actor!.id,
            x.rows[0].id,
          ],
        )
      ).rows[0];
      await c.query(
        `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'ROLE_UPDATED','merchant_role',$4)`,
        [newId('aud'), r.actor!.id, r.actor!.merchantId, changed.id],
      );
      return { row: changed };
      });
    } catch (error: any) {
      if (error.code === '23505') return p.code(409).send(apiError(r, 'ROLE_NAME_EXISTS', 'A role with this name already exists.'));
      throw error;
    }
    return !row
      ? p.code(404).send(apiError(r, 'ROLE_NOT_FOUND', 'Role not found.'))
      : 'system' in row
        ? p.code(409).send(apiError(r, 'SYSTEM_ROLE_PROTECTED', 'System roles cannot be edited.'))
        : viewRole(row.row);
  });
  app.post('/v1/roles/:id/archive', { preHandler: roleWrite }, async (r, p) => {
    const result = await transaction(db, async (c) => {
      const x = await c.query(
        'SELECT * FROM merchant_roles WHERE id=$1 AND merchant_id=$2 FOR UPDATE',
        [(r.params as any).id, r.actor!.merchantId],
      );
      if (!x.rowCount) return 'NOT_FOUND';
      if (x.rows[0].system_role) return 'SYSTEM';
      if (
        (
          await c.query(
            `SELECT 1 FROM user_role_assignments a JOIN users u ON u.id=a.user_id WHERE a.role_id=$1 AND a.merchant_id=$2 AND u.status IN ('ACTIVE','SUSPENDED') LIMIT 1`,
            [x.rows[0].id, r.actor!.merchantId],
          )
        ).rowCount
      )
        return 'ASSIGNED';
      await c.query(
        `UPDATE merchant_roles SET status='ARCHIVED',updated_by=$1,updated_at=now() WHERE id=$2`,
        [r.actor!.id, x.rows[0].id],
      );
      await c.query(
        `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'ROLE_ARCHIVED','merchant_role',$4)`,
        [newId('aud'), r.actor!.id, r.actor!.merchantId, x.rows[0].id],
      );
      return 'OK';
    });
    if (result === 'NOT_FOUND')
      return p.code(404).send(apiError(r, 'ROLE_NOT_FOUND', 'Role not found.'));
    if (result === 'SYSTEM')
      return p
        .code(409)
        .send(apiError(r, 'SYSTEM_ROLE_PROTECTED', 'System roles cannot be archived.'));
    if (result === 'ASSIGNED')
      return p.code(409).send(apiError(r, 'ROLE_STILL_ASSIGNED', 'Role is assigned to a member.'));
    return { status: 'ARCHIVED' };
  });
  app.get(
    '/v1/sessions',
    { preHandler: [auth, sessionOnly, requirePermission('sessions:read')] },
    async (r) => {
      const current = hash(String(r.cookies.giantpay_session ?? '')),
        x = await db.query(
          `SELECT public_id,created_at,last_seen_at,expires_at,revoked_at,token_hash=$2 current FROM sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC`,
          [r.actor!.id, current],
        );
      return x.rows;
    },
  );
  app.delete(
    '/v1/sessions/:id',
    { preHandler: [auth, sessionOnly, requirePermission('sessions:manage')] },
    async (r, p) =>
      transaction(db, async (c) => {
        const x = await c.query(
          `UPDATE sessions SET revoked_at=now() WHERE public_id=$1 AND user_id=$2 AND token_hash<>$3 AND revoked_at IS NULL RETURNING public_id`,
          [(r.params as any).id, r.actor!.id, hash(String(r.cookies.giantpay_session ?? ''))],
        );
        if (!x.rowCount) {
          p.code(404);
          return apiError(r, 'SESSION_NOT_FOUND', 'Session not found.');
        }
        await c.query(
          `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,'SESSION_REVOKED','session',$4,$5)`,
          [
            newId('aud'),
            r.actor!.id,
            r.actor!.merchantId,
            x.rows[0].public_id,
            { sessionPublicId: x.rows[0].public_id },
          ],
        );
        return x.rows[0];
      }),
  );
  app.post('/v1/sessions/revoke-others', { preHandler: self }, async (r) =>
    transaction(db, async (c) => {
      const current = hash(String(r.cookies.giantpay_session ?? '')),
        x = await c.query(
          `UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND token_hash<>$2 AND revoked_at IS NULL`,
          [r.actor!.id, current],
        );
      await c.query(
        `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,'ALL_OTHER_SESSIONS_REVOKED','user',$2,$4)`,
        [newId('aud'), r.actor!.id, r.actor!.merchantId, { revokedCount: x.rowCount ?? 0 }],
      );
      return { revokedCount: x.rowCount };
    }),
  );
  app.post(
    '/v1/security/mfa/enrollment',
    { preHandler: [...self, rateLimit(limits, config, 'mfa-enroll', 5, 900, (r) => r.actor!.id)] },
    async (r) => {
      const secret = generateTotpSecret();
      await db.query(
        `INSERT INTO mfa_enrollments(user_id,secret_ciphertext) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET secret_ciphertext=excluded.secret_ciphertext,verified_at=NULL,last_counter=NULL,updated_at=now() WHERE mfa_enrollments.verified_at IS NULL`,
        [r.actor!.id, encryptSecret(secret, config.WEBHOOK_SECRET_KEY ?? config.COOKIE_SECRET)],
      );
      return {
        secret,
        otpauthUri: `otpauth://totp/GiantPay:${encodeURIComponent(r.actor!.email)}?secret=${encodeURIComponent(secret)}&issuer=GiantPay`,
      };
    },
  );
  app.post(
    '/v1/security/mfa/enrollment/verify',
    {
      preHandler: [
        ...self,
        rateLimit(limits, config, 'mfa-enroll-verify', 5, 900, (r) => r.actor!.id),
      ],
    },
    async (r, p) => {
      const { code } = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(r.body),
        result = await transaction(db, async (c) => {
          const x = await c.query(
            `SELECT * FROM mfa_enrollments WHERE user_id=$1 AND verified_at IS NULL FOR UPDATE`,
            [r.actor!.id],
          );
          if (!x.rowCount) return null;
          const counter = verifyTotp(
            decryptSecret(
              x.rows[0].secret_ciphertext,
              config.WEBHOOK_SECRET_KEY ?? config.COOKIE_SECRET,
            ),
            code,
            null,
          );
          if (counter === null) return null;
          await c.query(
            `UPDATE mfa_enrollments SET verified_at=now(),last_counter=$1 WHERE user_id=$2`,
            [counter, r.actor!.id],
          );
          await c.query('UPDATE users SET mfa_enabled=true WHERE id=$1', [r.actor!.id]);
          const codes = recoveryCodes();
          for (const value of codes)
            await c.query(`INSERT INTO mfa_recovery_codes(id,user_id,code_hash) VALUES($1,$2,$3)`, [
              newId('mrc'),
              r.actor!.id,
              hash(value),
            ]);
          await c.query(
            `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'MFA_ENROLLMENT_COMPLETED','user',$2)`,
            [newId('aud'), r.actor!.id, r.actor!.merchantId],
          );
          return codes;
        });
      return result
        ? { recoveryCodes: result }
        : p.code(401).send(apiError(r, 'INVALID_MFA_CODE', 'Verification failed.'));
    },
  );
  app.post(
    '/v1/security/mfa/step-up',
    { preHandler: [...self, rateLimit(limits, config, 'mfa-step-up', 5, 900, (r) => r.actor!.id)] },
    async (r, p) => {
      const b = z
          .object({ code: z.string().min(6), factor: z.enum(['TOTP', 'RECOVERY']).default('TOTP') })
          .parse(r.body),
        result = await transaction(db, async (c) => {
          const enrollment = await c.query(
            'SELECT * FROM mfa_enrollments WHERE user_id=$1 AND verified_at IS NOT NULL FOR UPDATE',
            [r.actor!.id],
          );
          if (!enrollment.rowCount) return false;
          if (b.factor === 'TOTP') {
            const counter = verifyTotp(
              decryptSecret(
                enrollment.rows[0].secret_ciphertext,
                config.WEBHOOK_SECRET_KEY ?? config.COOKIE_SECRET,
              ),
              b.code,
              enrollment.rows[0].last_counter === null
                ? null
                : Number(enrollment.rows[0].last_counter),
            );
            if (counter === null) return false;
            await c.query('UPDATE mfa_enrollments SET last_counter=$1 WHERE user_id=$2', [
              counter,
              r.actor!.id,
            ]);
          } else {
            const code = await c.query(
              'SELECT * FROM mfa_recovery_codes WHERE user_id=$1 AND code_hash=$2 AND used_at IS NULL FOR UPDATE',
              [r.actor!.id, hash(b.code)],
            );
            if (!code.rowCount) return false;
            await c.query('UPDATE mfa_recovery_codes SET used_at=now() WHERE id=$1', [
              code.rows[0].id,
            ]);
          }
          const current = hash(String(r.cookies.giantpay_session ?? ''));
          const session = await c.query(
            'UPDATE sessions SET mfa_verified_at=now() WHERE token_hash=$1 AND user_id=$2 AND revoked_at IS NULL RETURNING public_id',
            [current, r.actor!.id],
          );
          if (!session.rowCount) return false;
          await c.query(
            `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,'MFA_STEP_UP_SUCCEEDED','session',$4,$5)`,
            [
              newId('aud'),
              r.actor!.id,
              r.actor!.merchantId,
              session.rows[0].public_id,
              { factor: b.factor },
            ],
          );
          return true;
        });
      if (!result) {
        await db.query(
          `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'MFA_STEP_UP_FAILED','user',$2)`,
          [newId('aud'), r.actor!.id, r.actor!.merchantId],
        );
        return p.code(401).send(apiError(r, 'INVALID_MFA_CODE', 'Verification failed.'));
      }
      return { verified: true, validForSeconds: 600 };
    },
  );
  app.post('/v1/security/mfa/recovery-codes/regenerate', { preHandler: self }, async (r, p) => {
    const current = hash(String(r.cookies.giantpay_session ?? '')),
      recent = await db.query(
        `SELECT 1 FROM sessions WHERE token_hash=$1 AND user_id=$2 AND mfa_verified_at>now()-interval '10 minutes'`,
        [current, r.actor!.id],
      );
    if (!recent.rowCount)
      return p
        .code(403)
        .send(apiError(r, 'RECENT_MFA_REQUIRED', 'Recent MFA verification is required.'));
    const codes = recoveryCodes();
    await transaction(db, async (c) => {
      await c.query('DELETE FROM mfa_recovery_codes WHERE user_id=$1', [r.actor!.id]);
      for (const value of codes)
        await c.query(`INSERT INTO mfa_recovery_codes(id,user_id,code_hash) VALUES($1,$2,$3)`, [
          newId('mrc'),
          r.actor!.id,
          hash(value),
        ]);
      await c.query(
        `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'RECOVERY_CODES_REGENERATED','user',$2)`,
        [newId('aud'), r.actor!.id, r.actor!.merchantId],
      );
    });
    return { recoveryCodes: codes };
  });
  app.post(
    '/v1/security/mfa/disable',
    { preHandler: [...self, rateLimit(limits, config, 'mfa-disable', 5, 900, (r) => r.actor!.id)] },
    async (r, p) => {
      const current = hash(String(r.cookies.giantpay_session ?? '')),
        recent = await db.query(
          `SELECT 1 FROM sessions WHERE token_hash=$1 AND user_id=$2 AND mfa_verified_at>now()-interval '10 minutes'`,
          [current, r.actor!.id],
        );
      if (!recent.rowCount)
        return p
          .code(403)
          .send(apiError(r, 'RECENT_MFA_REQUIRED', 'Recent MFA verification is required.'));
      await transaction(db, async (c) => {
        await c.query('DELETE FROM mfa_recovery_codes WHERE user_id=$1', [r.actor!.id]);
        await c.query('DELETE FROM mfa_enrollments WHERE user_id=$1', [r.actor!.id]);
        await c.query('UPDATE users SET mfa_enabled=false WHERE id=$1', [r.actor!.id]);
        await c.query(
          `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id) VALUES($1,$2,$3,'MFA_DISABLED','user',$2)`,
          [newId('aud'), r.actor!.id, r.actor!.merchantId],
        );
      });
      return { disabled: true };
    },
  );
}
