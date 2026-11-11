import { describe, expect, it } from 'vitest';
import { checkoutSubmitKey } from './submitKey';

describe('checkout retry keys', () => {
  it('reuses unresolved attempts across remounts and starts a new attempt after acknowledgment', () => {
    sessionStorage.clear();
    const attempt = checkoutSubmitKey('qr:opaque');
    expect(checkoutSubmitKey('qr:opaque').key).toBe(attempt.key);
    expect(checkoutSubmitKey('link:opaque').key).not.toBe(attempt.key);
    attempt.complete();
    expect(checkoutSubmitKey('qr:opaque').key).not.toBe(attempt.key);
  });
});
