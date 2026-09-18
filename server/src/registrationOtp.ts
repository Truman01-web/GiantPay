import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { Config } from './config.js';

export const REGISTRATION_OTP_TTL_MINUTES = 10;
export const REGISTRATION_OTP_RESEND_SECONDS = 60;
export const REGISTRATION_OTP_MAX_ATTEMPTS = 5;

export interface RegistrationOtpDelivery {
  available: boolean;
  queue(input: {
    challengeId: string;
    destination: string;
    code: string;
    expiresAt: string;
  }): Promise<boolean>;
}

export const disabledRegistrationOtpDelivery: RegistrationOtpDelivery = {
  available: false,
  async queue() {
    return false;
  },
};

export class TestRegistrationOtpDelivery implements RegistrationOtpDelivery {
  available = true;
  readonly messages: Array<{
    challengeId: string;
    destination: string;
    code: string;
    expiresAt: string;
  }> = [];
  async queue(input: {
    challengeId: string;
    destination: string;
    code: string;
    expiresAt: string;
  }) {
    this.messages.push(input);
    return true;
  }
}

export function generateRegistrationOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}
export function registrationOtpHmac(config: Config, challengeId: string, code: string): string {
  return createHmac('sha256', config.COOKIE_SECRET).update(`${challengeId}:${code}`).digest('hex');
}
export function destinationHash(config: Config, email: string): string {
  return createHmac('sha256', config.COOKIE_SECRET)
    .update(email.trim().toLowerCase())
    .digest('hex');
}
export function verifyRegistrationOtp(
  config: Config,
  challengeId: string,
  code: string,
  expected: string,
): boolean {
  const actual = registrationOtpHmac(config, challengeId, code);
  return (
    actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  );
}
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}
