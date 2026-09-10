import { describe, expect, it } from 'vitest';
import { addMoney, formatMoney, minorUnitDigits, parseMoneyInput, subtractMoney } from './money';

describe('money', () => {
  it('formats MWK minor units as currency', () => {
    expect(formatMoney(150000, 'MWK')).toContain('1,500.00');
  });

  it('defaults unknown currencies to 2 minor-unit digits', () => {
    expect(minorUnitDigits('XYZ')).toBe(2);
  });

  it('adds and subtracts using integer arithmetic only', () => {
    const a = { amountMinor: 1000, currency: 'MWK' };
    const b = { amountMinor: 250, currency: 'MWK' };
    expect(addMoney(a, b).amountMinor).toBe(1250);
    expect(subtractMoney(a, b).amountMinor).toBe(750);
  });

  it('throws when adding mismatched currencies', () => {
    expect(() => addMoney({ amountMinor: 100, currency: 'MWK' }, { amountMinor: 100, currency: 'USD' })).toThrow();
  });

  it('parses a decimal string into exact minor units without float drift', () => {
    expect(parseMoneyInput('1250.50', 'MWK')).toBe(125050);
    expect(parseMoneyInput('1,250.5', 'MWK')).toBe(125050);
    expect(parseMoneyInput('0.1', 'MWK')).toBe(10);
  });

  it('rejects invalid decimal input', () => {
    expect(parseMoneyInput('abc', 'MWK')).toBeNull();
    expect(parseMoneyInput('', 'MWK')).toBeNull();
  });
});
