export function requireSafeTestDatabase(raw: string | undefined, allowRemote = false): URL {
  if (!raw) throw new Error('TEST_DATABASE_URL is required for integration tests.');
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('TEST_DATABASE_URL is malformed.'); }
  if (!['postgres:','postgresql:'].includes(url.protocol)) throw new Error('TEST_DATABASE_URL must use PostgreSQL.');
  const database = decodeURIComponent(url.pathname.replace(/^\//,''));
  if (!database || !database.endsWith('_test')) throw new Error('Integration database name must end in _test.');
  if (['giantpay','giantpay_development','production','postgres'].includes(database.toLowerCase())) throw new Error('Development and production databases are forbidden.');
  const host = url.hostname.toLowerCase();
  if (!allowRemote && !['localhost','127.0.0.1','::1','postgres-test'].includes(host)) throw new Error('Remote test databases require explicit approval.');
  return url;
}
