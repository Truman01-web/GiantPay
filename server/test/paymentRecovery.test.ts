import { describe, it, expect } from 'vitest';
import { recoveryDelaySeconds, RECOVERY_MAX_ATTEMPTS } from '../src/payments/recoveryWorker.js';
describe('recovery budget', () => {
  it('backs off exponentially with a one-hour ceiling and finite attempt budget', () => {
    expect(recoveryDelaySeconds(1)).toBe(60);
    expect(recoveryDelaySeconds(2)).toBe(120);
    expect(recoveryDelaySeconds(8)).toBe(3600);
    expect(recoveryDelaySeconds(100)).toBe(3600);
    expect(RECOVERY_MAX_ATTEMPTS).toBe(8);
  });
});
