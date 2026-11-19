// The API sends amounts as decimal strings with two places (e.g. "7000000.00", like NUMERIC(14,2)).
// Integer cents avoid floating point errors in sums and ratios.
export function toCents(amount: string | number): number {
  const text = typeof amount === 'number' ? amount.toFixed(2) : amount.trim();
  const negative = text.startsWith('-');
  const [whole = '0', fraction = ''] = text.replace(/^[-+]/, '').split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
  return negative ? -cents : cents;
}

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// "$ 7.000.000" (no decimals, as in the approved design). Cents are rounded, never truncated.
export function formatCop(amount: string | number): string {
  return COP.format(Math.round(toCents(amount) / 100));
}

// 12.5 -> "12,5 %" (Colombian decimal comma).
export function formatPercent(value: number): string {
  return `${String(value).replace('.', ',')} %`;
}

const USD = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

// Balance with its sign in text, never only in color: "− $ 250.000" for a negative one.
export function formatSignedBalance(amount: string, currencyCode: string): string {
  const negative = toCents(amount) < 0;
  const absolute = negative ? amount.trim().replace(/^-/, '') : amount;
  return `${negative ? '− ' : ''}${formatMoney(absolute, currencyCode)}`;
}

// Amount with its own currency: COP without decimals, USD with two. Another code falls back to "123,45 XYZ".
export function formatMoney(amount: string | number, currencyCode: string): string {
  if (currencyCode === 'COP') return formatCop(amount);
  if (currencyCode === 'USD') return USD.format(toCents(amount) / 100);
  return `${(toCents(amount) / 100).toFixed(2).replace('.', ',')} ${currencyCode}`;
}
