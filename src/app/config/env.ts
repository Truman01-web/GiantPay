const rawEnv = import.meta.env;

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function normalizeApiUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('VITE_API_URL must be an absolute HTTP(S) URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('VITE_API_URL must be a credential-free HTTP(S) origin with no query or fragment.');
  }
  return parsed.toString().replace(/\/$/, '');
}

const mockAllowedEnvironments = new Set(['development', 'test', 'e2e']);

export function validateFrontendEnv(source: { VITE_API_URL?: string; VITE_APP_ENV?: string; VITE_USE_MOCK_API?: string }) {
  const useMockApi = source.VITE_USE_MOCK_API === 'true';
  const appEnv = source.VITE_APP_ENV || 'development';
  if (useMockApi && !mockAllowedEnvironments.has(appEnv)) {
    throw new Error(
      `VITE_USE_MOCK_API=true is forbidden in VITE_APP_ENV=${appEnv}. Mocks are restricted to local development and tests.`,
    );
  }
  return { apiUrl: normalizeApiUrl(required('VITE_API_URL', source.VITE_API_URL)), appEnv, useMockApi };
}

const validated = validateFrontendEnv(rawEnv);

export const env = {
  apiUrl: validated.apiUrl,
  appName: rawEnv.VITE_APP_NAME || 'GiantPay',
  appEnv: validated.appEnv,
  useMockApi: validated.useMockApi,
  sentryDsn: rawEnv.VITE_SENTRY_DSN || null,
  isProd: Boolean(rawEnv.PROD),
  isDev: Boolean(rawEnv.DEV),
};
