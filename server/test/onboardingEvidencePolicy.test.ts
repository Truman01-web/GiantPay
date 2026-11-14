import { describe, expect, it } from 'vitest';
import { evidenceSatisfiesSubmissionPolicy } from '../src/onboarding/routes.js';

describe('onboarding evidence availability policy', () => {
  const record = (scan_state: string, removed_at: unknown = null) => ({ scan_state, removed_at });

  it('requires CLEAN evidence in secure binary mode', () => {
    expect(evidenceSatisfiesSubmissionPolicy('secure_binary', [record('CLEAN')])).toBe(true);
    expect(evidenceSatisfiesSubmissionPolicy('secure_binary', [record('HISTORICAL_METADATA')])).toBe(false);
  });

  it('allows honest historical metadata only in sandbox metadata mode', () => {
    expect(evidenceSatisfiesSubmissionPolicy('sandbox_metadata', [record('HISTORICAL_METADATA')])).toBe(true);
    expect(evidenceSatisfiesSubmissionPolicy('sandbox_metadata', [record('QUARANTINED'), record('FAILED')])).toBe(false);
  });

  it('never accepts removed, quarantined, scanning, rejected or failed evidence', () => {
    for (const mode of ['secure_binary', 'sandbox_metadata'] as const) {
      expect(evidenceSatisfiesSubmissionPolicy(mode, [record('CLEAN', new Date()), record('QUARANTINED'), record('SCANNING'), record('REJECTED'), record('FAILED')])).toBe(false);
    }
  });
});
