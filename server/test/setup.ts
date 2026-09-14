import { requireSafeTestDatabase } from './integrationGuard.js';

if (process.env.REQUIRE_INTEGRATION_TESTS === 'true') {
  requireSafeTestDatabase(process.env.TEST_DATABASE_URL, process.env.ALLOW_REMOTE_TEST_DATABASE === 'true');
  if (!process.env.TEST_REDIS_URL) throw new Error('TEST_REDIS_URL is required for integration tests.');
}
