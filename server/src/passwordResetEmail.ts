import type { Config } from './config.js';
import type { Db } from './db.js';
import { tokenHash } from './security.js';
import { decryptSecret } from './developer/webhookSecurity.js';
import type { OutboxMessage, OutboxPublisher } from './outbox/outboxWorker.js';
import { createSmtpSender, type SmtpSender } from './smtpRegistrationOtp.js';

const RESET_EVENT = 'security.password_reset.requested';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
}

export class SmtpPasswordResetEmailPublisher implements OutboxPublisher {
  private readonly sender: SmtpSender;

  constructor(
    private readonly db: Db,
    private readonly config: Config,
    sender?: SmtpSender,
  ) {
    this.sender = sender ?? createSmtpSender(config);
  }

  async publish(message: OutboxMessage): Promise<void> {
    if (message.eventType !== RESET_EVENT) return;
    if (!this.config.EXTERNAL_DELIVERY_ENABLED) return;
    if (message.aggregateType !== 'password_reset')
      throw new Error('PASSWORD_RESET_EVENT_INVALID');

    const payload = message.payload as { userId?: unknown; tokenCiphertext?: unknown } | null;
    if (
      !payload ||
      typeof payload.userId !== 'string' ||
      typeof payload.tokenCiphertext !== 'string'
    ) {
      throw new Error('PASSWORD_RESET_EVENT_INVALID');
    }

    let token: string;
    try {
      token = decryptSecret(
        payload.tokenCiphertext,
        this.config.WEBHOOK_SECRET_KEY ?? this.config.COOKIE_SECRET,
      );
    } catch {
      throw new Error('PASSWORD_RESET_EVENT_INVALID');
    }

    const result = await this.db.query(
      `SELECT u.email
         FROM password_reset_requests r
         JOIN users u ON u.id=r.user_id
        WHERE r.id=$1 AND r.user_id=$2 AND r.token_hash=$3
          AND r.used_at IS NULL AND r.expires_at>now()
          AND u.status='ACTIVE' AND u.email_verified_at IS NOT NULL`,
      [message.aggregateId, payload.userId, tokenHash(token)],
    );
    if (!result.rowCount) return;

    const resetUrl = new URL('/reset-password', this.config.FRONTEND_ORIGIN);
    resetUrl.searchParams.set('token', token);
    const link = resetUrl.toString();
    const expiryMinutes = 30;
    const email = {
      to: String(result.rows[0].email),
      subject: 'Reset your GiantPay password',
      text: [
        'We received a request to reset your GiantPay password.',
        `Use this secure link to choose a new password: ${link}`,
        `This link expires in ${expiryMinutes} minutes and can only be used once.`,
        'If you did not request this change, you can ignore this email.',
      ].join('\n\n'),
      html: `<h1>Reset your GiantPay password</h1><p>We received a request to reset your GiantPay password.</p><p><a href="${escapeHtml(link)}">Choose a new password</a></p><p>This link expires in ${expiryMinutes} minutes and can only be used once.</p><p>If you did not request this change, you can ignore this email.</p>`,
    };

    try {
      await this.sender(email);
    } catch {
      throw new Error('PASSWORD_RESET_EMAIL_DELIVERY_FAILED');
    }
  }
}
