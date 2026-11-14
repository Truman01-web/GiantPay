import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const mockApiEnabled = process.env.VITE_USE_MOCK_API === 'true';

if (!mockApiEnabled) {
  const workerPath = resolve('dist/mockServiceWorker.js');
  if (existsSync(workerPath)) {
    rmSync(workerPath, { force: true });
  }
}
