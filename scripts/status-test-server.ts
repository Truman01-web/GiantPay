import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// Launch Node directly, so Windows does not leave a pnpm/cmd child tree behind.
export default async function setup() {
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4178', '--strictPort'], {
    env: { ...process.env, VITE_API_URL: 'http://127.0.0.1:4499', VITE_APP_ENV: 'development', VITE_USE_MOCK_API: 'false' },
    stdio: 'ignore', windowsHide: true,
  });
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  try {
    for (let i = 0; i < 120; i++) {
      if (child.exitCode !== null) throw new Error('Status test server exited before becoming ready');
      try { if ((await fetch('http://127.0.0.1:4178')).ok) return async () => { child.kill(); await exited; }; } catch { /* retry */ }
      await delay(1000);
    }
    throw new Error('Status test server did not become ready');
  } catch (error) {
    child.kill();
    await exited;
    throw error;
  }
}
