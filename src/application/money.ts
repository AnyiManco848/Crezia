const AMOUNT = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

// Money is handled in integer cents to avoid floating point errors (0.1 + 0.2).
// NUMERIC(14,2) fits well inside Number.MAX_SAFE_INTEGER once expressed in cents.
export function toCents(amount: string): number {
  const match = AMOUNT.exec(amount.trim());
  if (!match) throw new Error(`Invalid amount: ${amount}`);
  const [, sign, whole, fraction = ''] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return sign ? -cents : cents;
}

// Decimal string with two places (e.g. "1803000.00"), like NUMERIC(14,2).
export function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
