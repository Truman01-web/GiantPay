import { describe, expect, it } from 'vitest';
import { normalizeMalawiPhone } from './phone';

describe('normalizeMalawiPhone', () => {
  it.each([['+265 991 234 567', '+265991234567'], ['0991234567', '+265991234567'], ['265991234567', '+265991234567']])('normalizes %s', (input, expected) => {
    expect(normalizeMalawiPhone(input)).toBe(expected);
  });
});
