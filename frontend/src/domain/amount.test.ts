import { describe, expect, it } from 'vitest';
import { amountToInput, parseAmountInput } from './amount';

const value = (raw: string) => {
  const result = parseAmountInput(raw);
  return result.ok ? result.value : `ERROR: ${result.message}`;
};

describe('parseAmountInput', () => {
  it.each([
    ['85000', '85000'],
    ['  85000  ', '85000'],
    ['85000,5', '85000.5'],
    ['85000,50', '85000.50'],
    ['85000.50', '85000.50'],
    ['1.5', '1.5'],
    ['0,01', '0.01'],
    ['007', '7'],
    ['85 000', '85000'],
    ['85000,', '85000'],
  ])('reads %j as %j', (raw, expected) => {
    expect(value(raw)).toBe(expected);
  });

  it('asks for the amount when empty', () => {
    expect(value('')).toBe('ERROR: El monto es obligatorio');
    expect(value('   ')).toBe('ERROR: El monto es obligatorio');
  });

  it.each(['0', '0,00', '0.0'])('rejects the non-positive amount %j', (raw) => {
    expect(value(raw)).toBe('ERROR: El monto debe ser mayor a 0');
  });

  it.each(['-5', '+5', 'abc', '12abc', '1e3', '$85000', '1,2,3', '1.2.3', ',5'])('rejects the malformed amount %j', (raw) => {
    expect(value(raw)).toMatch(/^ERROR: /);
  });

  it('never reads "85.000" as 85: it asks for no thousands separator', () => {
    expect(value('85.000')).toContain('sin separador de miles');
    expect(value('1.000')).toContain('sin separador de miles');
  });

  it('rejects more than 2 decimals with a comma', () => {
    expect(value('85,000')).toBe('ERROR: El monto admite hasta 2 decimales');
    expect(value('1,234')).toBe('ERROR: El monto admite hasta 2 decimales');
    expect(value('1.2345')).toBe('ERROR: El monto admite hasta 2 decimales');
  });

  it('limits to 12 integer digits, as the API does', () => {
    expect(value('999999999999')).toBe('999999999999');
    expect(value('1000000000000')).toBe('ERROR: El monto admite hasta 12 dígitos enteros');
  });
});

describe('amountToInput', () => {
  it('drops empty decimals and uses a comma', () => {
    expect(amountToInput('85000.00')).toBe('85000');
    expect(amountToInput('85000.50')).toBe('85000,5');
    expect(amountToInput('85000.05')).toBe('85000,05');
  });

  it('round-trips with parseAmountInput', () => {
    for (const amount of ['85000.00', '85000.50', '0.05', '7.25']) {
      const parsed = parseAmountInput(amountToInput(amount));
      expect(parsed.ok && Number(parsed.value)).toBe(Number(amount));
    }
  });
});
