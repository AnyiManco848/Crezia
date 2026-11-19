import { describe, expect, it } from 'vitest';
import { incomeExpenseShare, savingsRate } from './savingsRate';

describe('savingsRate', () => {
  it('is balance divided by income, with one decimal', () => {
    expect(savingsRate('7000000.00', '2500000.00')).toBe(35.7);
    expect(savingsRate('1000.00', '1000.00')).toBe(100);
    expect(savingsRate('3000000.00', '1000000.00')).toBe(33.3);
  });

  it('is zero when everything was spent', () => {
    expect(savingsRate('500000.00', '0.00')).toBe(0);
  });

  it('is negative when expenses win', () => {
    expect(savingsRate('1000000.00', '-250000.00')).toBe(-25);
  });

  it('is hidden (null) when there is no income', () => {
    expect(savingsRate('0.00', '-80000.00')).toBeNull();
  });

  it('does not suffer from floating point drift', () => {
    expect(savingsRate('0.30', '0.10')).toBe(33.3);
  });
});

describe('incomeExpenseShare', () => {
  it('splits the total moved and always adds up to 100', () => {
    const share = incomeExpenseShare('7000000.00', '4500000.00')!;
    expect(share).toEqual({ income: 60.9, expense: 39.1 });
    expect(share.income + share.expense).toBeCloseTo(100, 5);
  });

  it('is all expenses when there is no income, and all income when there are no expenses', () => {
    expect(incomeExpenseShare('0.00', '100.00')).toEqual({ income: 0, expense: 100 });
    expect(incomeExpenseShare('100.00', '0.00')).toEqual({ income: 100, expense: 0 });
  });

  it('has no bar when nothing moved', () => {
    expect(incomeExpenseShare('0.00', '0.00')).toBeNull();
  });
});
