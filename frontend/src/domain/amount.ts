export type AmountParse = { ok: true; value: string } | { ok: false; message: string };

export const AMOUNT_REQUIRED = 'El monto es obligatorio';
export const AMOUNT_INVALID = 'El monto debe ser mayor a 0';
export const AMOUNT_FORMAT = 'Escribe solo números, con coma o punto para los decimales (por ejemplo 85000 o 85000,50)';
export const AMOUNT_THOUSANDS = 'Escribe el monto sin separador de miles (por ejemplo 85000, no 85.000)';
export const AMOUNT_TOO_MANY_DECIMALS = 'El monto admite hasta 2 decimales';
export const AMOUNT_TOO_BIG = 'El monto admite hasta 12 dígitos enteros';

// Reads what the person typed into the decimal string the API expects ("85000.50"). It never guesses:
// "85.000" could mean 85 or 85,000 (in Colombia a dot groups thousands), and a silent 1000x error in money
// is worse than asking again, so a dot followed by exactly 3 digits is rejected with an explanation.
export function parseAmountInput(raw: string): AmountParse {
  const text = raw.trim().replace(/\s/g, '');
  if (text === '') return { ok: false, message: AMOUNT_REQUIRED };
  if (!/^\d+(?:[.,]\d*)?$/.test(text)) return { ok: false, message: AMOUNT_FORMAT };
  if (/^\d+\.\d{3}$/.test(text)) return { ok: false, message: AMOUNT_THOUSANDS };

  const [whole = '', fraction = ''] = text.replace(',', '.').split('.');
  if (fraction.length > 2) return { ok: false, message: AMOUNT_TOO_MANY_DECIMALS };
  const integer = whole.replace(/^0+(?=\d)/, '');
  if (integer.length > 12) return { ok: false, message: AMOUNT_TOO_BIG };
  if (!/[1-9]/.test(integer + fraction)) return { ok: false, message: AMOUNT_INVALID };
  return { ok: true, value: fraction ? `${integer}.${fraction}` : integer };
}

// "85000.50" -> "85000,5" for the edit form (the amount comes from the API as a decimal string).
export function amountToInput(amount: string): string {
  const [whole = '', fraction = ''] = amount.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  return trimmed === '' ? whole : `${whole},${trimmed}`;
}
