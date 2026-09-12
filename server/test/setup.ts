import { requireSafeTestDatabase } from './integrationGuard.js';

if (process.env.REQUIRE_INTEGRATION_TESTS === 'true') {
  requireSafeTestDatabase(process.env.TEST_DATABASE_URL, process.env.ALLOW_REMOTE_TEST_DATABASE === 'true');
}
