import type { Config } from '../config.js';
import type { PaymentProvider } from './types.js';
import { SandboxPaymentProvider } from './sandboxProvider.js';
import {
  FlutterwavePaymentProvider,
  RealFlutterwaveHttpClient,
} from './flutterwaveProvider.js';

export function createPaymentProvider(config: Config): PaymentProvider {
  if (config.PAYMENT_PROVIDER === 'sandbox') {
    return new SandboxPaymentProvider(
      config.SANDBOX_WEBHOOK_SECRET,
      config.WEBHOOK_TOLERANCE_SECONDS,
      config.DEPLOYMENT_ENVIRONMENT ?? config.NODE_ENV,
    );
  }

  if (config.PAYMENT_PROVIDER === 'flutterwave') {
    if (!config.FLW_SECRET_KEY?.startsWith('FLWSECK_TEST-')) {
      throw new Error('Live collections are disabled. Flutterwave requires a test secret key.');
    }
    // These are validated by loadConfig — they will be present here.
    const secretKey = config.FLW_SECRET_KEY!;
    const publicKey = config.FLW_PUBLIC_KEY!;
    const secretHash = config.FLW_SECRET_HASH!;
    const redirectBaseUrl = config.FLW_REDIRECT_BASE_URL!;

    // Live collections are disabled until credentials are authorized.
    // The RealFlutterwaveHttpClient will be used once EXTERNAL_DELIVERY_ENABLED
    // and live provider access are configured. For local/test use, inject a
    // synthetic HttpClient via the test helpers instead.
    const httpClient = new RealFlutterwaveHttpClient(secretKey);

    return new FlutterwavePaymentProvider(
      secretKey,
      publicKey,
      secretHash,
      redirectBaseUrl,
      httpClient,
      config.DEPLOYMENT_ENVIRONMENT,
    );
  }

  throw new Error(`Unsupported payment provider: ${String(config.PAYMENT_PROVIDER)}`);
}
