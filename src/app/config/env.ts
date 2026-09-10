const rawEnv = import.meta.env;

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const useMockApi = rawEnv.VITE_USE_MOCK_API === 'true';
const appEnv = rawEnv.VITE_APP_ENV || 'development';

// Gate on our own VITE_APP_ENV rather than Vite's built-in PROD flag: a
// `vite build` also produces the e2e-test and staging bundles (so they can
// run against a realistic, minified preview server), and those are allowed
// to use mocks. Only the actual production environment must never combine
// a production build with a mocked backend — fail loudly at startup rather
// than silently serving fake financial data to real users.
if (useMockApi && appEnv === 'production') {
  throw new Error(
    'VITE_USE_MOCK_API=true with VITE_APP_ENV=production. Refusing to start — see docs/frontend-security.md.',
  );
}

export const env = {
  apiUrl: required('VITE_API_URL', rawEnv.VITE_API_URL),
  appName: rawEnv.VITE_APP_NAME || 'GiantPay',
  appEnv,
  useMockApi,
  sentryDsn: rawEnv.VITE_SENTRY_DSN || null,
  isProd: Boolean(rawEnv.PROD),
  isDev: Boolean(rawEnv.DEV),
};
