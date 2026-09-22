import type { Config } from './config.js';

export function assertSeedingAllowed(config: Config): void {
  if (config.NODE_ENV === 'production' || config.DEPLOYMENT_ENVIRONMENT === 'production')
    throw new Error('Database seeding is forbidden in production');
}
