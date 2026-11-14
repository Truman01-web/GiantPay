import { connect, type TLSSocket } from 'node:tls';
import type { Config } from './config.js';
import type {
  RegistrationOtpDelivery,
  RegistrationOtpDeliveryResult,
} from './registrationOtp.js';
import { disabledRegistrationOtpDelivery } from './registrationOtp.js';

type SmtpMessage = { to: string; subject: string; text: string; html: string };
export type SmtpSender = (message: SmtpMessage) => Promise<void>;

const CRLF = '\r\n';
const encodeHeader = (value: string) => value.replace(/[\r\n]/g, ' ');
const dotStuff = (value: string) => value.replace(/^\./gm, '..');
const addressOnly = (value: string) => value.match(/<([^<>]+)>$/)?.[1]?.trim() ?? value.trim();

class ReplyReader {
  private buffer = '';
  private pending: Array<{
    resolve: (reply: { code: number; message: string }) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(socket: TLSSocket) {
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      this.buffer += chunk;
      this.flush();
    });
    socket.on('error', (error) => this.fail(error));
    socket.on('close', () => this.fail(new Error('SMTP connection closed unexpectedly')));
  }

  next() {
    return new Promise<{ code: number; message: string }>((resolve, reject) => {
      this.pending.push({ resolve, reject });
      this.flush();
    });
  }

  private flush() {
    if (!this.pending.length) return;
    const lines = this.buffer.split(CRLF);
    if (lines.length < 2) return;
    let end = -1;
    for (let index = 0; index < lines.length - 1; index += 1) {
      if (/^\d{3} /.test(lines[index] ?? '')) {
        end = index;
        break;
      }
    }
    if (end < 0) return;
    const replyLines = lines.slice(0, end + 1);
    this.buffer = lines.slice(end + 1).join(CRLF);
    const code = Number(replyLines.at(-1)?.slice(0, 3));
    this.pending.shift()?.resolve({ code, message: replyLines.join(' ') });
    this.flush();
  }

  private fail(error: Error) {
    for (const waiter of this.pending.splice(0)) waiter.reject(error);
  }
}

async function expectReply(reader: ReplyReader, accepted: number[]) {
  const reply = await reader.next();
  if (!accepted.includes(reply.code)) throw new Error(`SMTP rejected command (${reply.code})`);
}

export function createSmtpSender(config: Config): SmtpSender {
  const host = config.SMTP_HOST!;
  const port = config.SMTP_PORT;
  const username = config.SMTP_USER!;
  const password = config.SMTP_PASSWORD!;
  const from = config.SMTP_FROM!;
  return async (message) => {
    const socket = connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    });
    socket.setTimeout(config.SMTP_TIMEOUT_MS, () => socket.destroy(new Error('SMTP timeout')));
    const reader = new ReplyReader(socket);
    const command = async (value: string, accepted: number[]) => {
      socket.write(`${value}${CRLF}`);
      await expectReply(reader, accepted);
    };
    try {
      await expectReply(reader, [220]);
      await command('EHLO giantpay.mw', [250]);
      await command('AUTH LOGIN', [334]);
      await command(Buffer.from(username).toString('base64'), [334]);
      await command(Buffer.from(password).toString('base64'), [235]);
      await command(`MAIL FROM:<${addressOnly(from)}>`, [250]);
      await command(`RCPT TO:<${message.to}>`, [250, 251]);
      await command('DATA', [354]);
      const payload = [
        `From: ${encodeHeader(from)}`,
        `To: ${encodeHeader(message.to)}`,
        `Subject: ${encodeHeader(message.subject)}`,
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="giantpay-otp"',
        '',
        '--giantpay-otp',
        'Content-Type: text/plain; charset=UTF-8',
        '',
        dotStuff(message.text),
        '--giantpay-otp',
        'Content-Type: text/html; charset=UTF-8',
        '',
        dotStuff(message.html),
        '--giantpay-otp--',
        '.',
        '',
      ].join(CRLF);
      socket.write(payload);
      await expectReply(reader, [250]);
      await command('QUIT', [221]);
    } finally {
      socket.destroy();
    }
  };
}

function verificationMessage(code: string, expiresAt: string): SmtpMessage {
  const expiry = new Date(expiresAt).toISOString();
  return {
    to: '',
    subject: 'Verify your GiantPay account',
    text: `Your GiantPay verification code is ${code}. It expires at ${expiry}. Do not share this code with anyone. If you did not request this registration, ignore this email.`,
    html: `<h1>Verify your GiantPay account</h1><p>Your verification code is <strong>${code}</strong>.</p><p>It expires at ${expiry}.</p><p>Do not share this code with anyone. GiantPay will never ask you for it.</p><p>If you did not request this registration, ignore this email.</p>`,
  };
}

export class SmtpRegistrationOtpDelivery implements RegistrationOtpDelivery {
  readonly available = true;
  private readonly sender: SmtpSender;
  private readonly deliveredChallenges = new Set<string>();

  constructor(private readonly config: Config, sender?: SmtpSender) {
    this.sender = sender ?? createSmtpSender(config);
  }

  async queue(input: {
    challengeId: string;
    destination: string;
    code: string;
    expiresAt: string;
  }): Promise<RegistrationOtpDeliveryResult> {
    const attemptedAt = new Date().toISOString();
    if (this.deliveredChallenges.has(input.challengeId))
      return { queued: true, provider: 'smtp', attemptedAt };
    try {
      const message = verificationMessage(input.code, input.expiresAt);
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('SMTP timeout')),
          this.config.SMTP_TIMEOUT_MS,
        );
        void this.sender({ ...message, to: input.destination }).then(
          () => {
            clearTimeout(timeout);
            resolve();
          },
          (error: unknown) => {
            clearTimeout(timeout);
            reject(error instanceof Error ? error : new Error('SMTP rejected delivery'));
          },
        );
      });
      this.deliveredChallenges.add(input.challengeId);
      return { queued: true, provider: 'smtp', attemptedAt };
    } catch (error) {
      const failureCode =
        error instanceof Error && /timeout/i.test(error.message)
          ? 'DELIVERY_TIMEOUT'
          : 'DELIVERY_REJECTED';
      return { queued: false, provider: 'smtp', attemptedAt, failureCode };
    }
  }
}

export function createRegistrationOtpDelivery(config: Config): RegistrationOtpDelivery {
  return config.EXTERNAL_DELIVERY_ENABLED
    ? new SmtpRegistrationOtpDelivery(config)
    : disabledRegistrationOtpDelivery;
}
