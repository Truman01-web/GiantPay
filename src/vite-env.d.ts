/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_USE_MOCK_API: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_PORTAL_CONTEXT: 'merchant' | 'staff';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
