export function normalizeMalawiPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('265') ? digits.slice(3) : digits.replace(/^0/, '');
  return `+265${local.slice(0, 9)}`;
}
