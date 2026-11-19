import { describe, expect, it } from 'vitest';
import { formatCop, formatMoney, formatPercent, formatSignedBalance, toCents } from './money';

// Intl uses non-breaking spaces; compare with normal ones.
const plain = (text: string) => text.split(String.fromCharCode(160)).join(' ').split(String.fromCharCode(8239)).join(' ');

describe('toCents', () => {
  it('reads API decimal strings without floating point errors', () => {
    expect(toCents('7000000.00')).toBe(700000000);
    expect(toCents('85000.5')).toBe(8500050);
    expect(toCents('0.07')).toBe(7);
    expect(toCents('1234')).toBe(123400);
    expect(toCents('999999999999.99')).toBe(99999999999999);
  });

  it('handles negatives and numbers', () => {
    expect(toCents('-1803000.00')).toBe(-180300000);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });
});

describe('formatCop', () => {
  it('formats Colombian pesos with dot separators and no decimals', () => {
    expect(plain(formatCop('7000000.00'))).toBe('$ 7.000.000');
    expect(plain(formatCop('0.00'))).toBe('$ 0');
    expect(plain(formatCop('1500.00'))).toBe('$ 1.500');
  });

  it('rounds cents instead of cutting them', () => {
    expect(plain(formatCop('85000.50'))).toBe('$ 85.001');
    expect(plain(formatCop('85000.49'))).toBe('$ 85.000');
  });
});

describe('formatMoney', () => {
  it('formats COP without decimals and USD with two', () => {
    expect(plain(formatMoney('85000.00', 'COP'))).toBe('$ 85.000');
    expect(plain(formatMoney('1234.5', 'USD'))).toMatch(/1\.234,50/);
  });

  it('falls back to the code for another currency', () => {
    expect(formatMoney('10.5', 'EUR')).toBe('10,50 EUR');
  });
});

describe('formatSignedBalance', () => {
  it('writes the minus sign for a negative balance and nothing for a positive one', () => {
    expect(plain(formatSignedBalance('-250000.00', 'COP'))).toBe('− $ 250.000');
    expect(plain(formatSignedBalance('1803000.00', 'COP'))).toBe('$ 1.803.000');
    expect(plain(formatSignedBalance('0.00', 'COP'))).toBe('$ 0');
  });
});

describe('formatPercent', () => {
  it('uses the decimal comma', () => {
    expect(formatPercent(12.5)).toBe('12,5 %');
    expect(formatPercent(100)).toBe('100 %');
    expect(formatPercent(0)).toBe('0 %');
  });
});
