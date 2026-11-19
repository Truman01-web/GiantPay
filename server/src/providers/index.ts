import type { Config } from '../config.js';
import type { PaymentProvider } from './types.js';
import { SandboxPaymentProvider } from './sandboxProvider.js';
import {
  FlutterwavePaymentProvider,
  RealFlutterwaveHttpClient,
} from './flutterwaveProvider.js';
import {
  OneKhusaPaymentProvider,
  RealOneKhusaHttpClient,
} from './oneKhusaProvider.js';

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

  if (config.PAYMENT_PROVIDER === 'onekhusa') {
    // loadConfig() already enforces DEPLOYMENT_ENVIRONMENT !== 'production'
    // and that all ONEKHUSA_* fields below are present when this branch runs.
    const apiKey = config.ONEKHUSA_API_KEY!;
    const apiSecret = config.ONEKHUSA_API_SECRET!;
    const organisationId = config.ONEKHUSA_ORGANISATION_ID!;
    const merchantAccountNumber = config.ONEKHUSA_MERCHANT_ACCOUNT_NUMBER!;
    const airtelConnectorId = config.ONEKHUSA_AIRTEL_CONNECTOR_ID!;
    const tnmConnectorId = config.ONEKHUSA_TNM_CONNECTOR_ID!;
    const capturedByEmail = config.ONEKHUSA_CAPTURED_BY_EMAIL!;
    const webhookSecretSuccess = config.ONEKHUSA_WEBHOOK_SECRET_SUCCESS!;
    const webhookSecretFailed = config.ONEKHUSA_WEBHOOK_SECRET_FAILED!;
    const webhookSecretReversed = config.ONEKHUSA_WEBHOOK_SECRET_REVERSED!;

    const httpClient = new RealOneKhusaHttpClient();

    return new OneKhusaPaymentProvider(
      apiKey,
      apiSecret,
      organisationId,
      merchantAccountNumber,
      airtelConnectorId,
      tnmConnectorId,
      capturedByEmail,
      webhookSecretSuccess,
      webhookSecretFailed,
      webhookSecretReversed,
      httpClient,
      config.DEPLOYMENT_ENVIRONMENT,
    );
  }

  throw new Error(`Unsupported payment provider: ${String(config.PAYMENT_PROVIDER)}`);
}
