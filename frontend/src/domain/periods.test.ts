import { describe, expect, it } from 'vitest';
import { getPeriodRange, isPeriodKey, PERIODS } from './periods';

const NOW = new Date(2026, 10, 18, 15, 30); // 2026-11-18, local time

describe('getPeriodRange', () => {
  it('this month: first to last day', () => {
    expect(getPeriodRange('thisMonth', NOW)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
  });

  it('previous month', () => {
    expect(getPeriodRange('prevMonth', NOW)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('previous month in January goes back to December of the previous year', () => {
    expect(getPeriodRange('prevMonth', new Date(2026, 0, 15))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('last 30 days: today and the 29 days before it, crossing months', () => {
    expect(getPeriodRange('last30', NOW)).toEqual({ from: '2026-10-20', to: '2026-11-18' });
    expect(getPeriodRange('last30', new Date(2026, 2, 5))).toEqual({ from: '2026-02-04', to: '2026-03-05' });
  });

  it('this year: January 1 to December 31', () => {
    expect(getPeriodRange('thisYear', NOW)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('handles February in a leap year', () => {
    expect(getPeriodRange('thisMonth', new Date(2028, 1, 10))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('does not shift the day with the time (local calendar, not UTC)', () => {
    expect(getPeriodRange('last30', new Date(2026, 10, 18, 0, 5)).to).toBe('2026-11-18');
    expect(getPeriodRange('last30', new Date(2026, 10, 18, 23, 55)).to).toBe('2026-11-18');
  });

  it('every period fits in the API limit of 366 days, in a normal and a leap year', () => {
    for (const now of [NOW, new Date(2028, 11, 31), new Date(2028, 0, 1)]) {
      for (const { key } of PERIODS) {
        const { from, to } = getPeriodRange(key, now);
        const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
        expect(days).toBeGreaterThanOrEqual(1);
        expect(days).toBeLessThanOrEqual(366);
        expect(from <= to).toBe(true);
      }
    }
  });
});

describe('isPeriodKey', () => {
  it('only accepts the four known periods', () => {
    expect(isPeriodKey('thisMonth')).toBe(true);
    expect(isPeriodKey('last30')).toBe(true);
    expect(isPeriodKey('yesterday')).toBe(false);
  });
});
