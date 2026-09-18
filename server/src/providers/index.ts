import type { Config } from '../config.js';
import type { PaymentProvider } from './types.js';
import { SandboxPaymentProvider } from './sandboxProvider.js';

export function createPaymentProvider(config: Config): PaymentProvider {
  if (config.PAYMENT_PROVIDER === 'sandbox') {
    return new SandboxPaymentProvider(
      config.SANDBOX_WEBHOOK_SECRET,
      config.WEBHOOK_TOLERANCE_SECONDS,
      config.DEPLOYMENT_ENVIRONMENT ?? config.NODE_ENV,
    );
  }
  throw new Error(`Unsupported payment provider: ${String(config.PAYMENT_PROVIDER)}`);
}
