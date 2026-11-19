import { describe, expect, it } from 'vitest';
import { formatDate } from './dates';

describe('formatDate', () => {
  it('formats a calendar date as "DD mon YYYY" without "de"', () => {
    expect(formatDate('2026-11-01')).toBe('01 nov 2026');
    expect(formatDate('2026-01-31')).toBe('31 ene 2026');
    expect(formatDate('2026-09-05')).toBe('05 sep 2026');
  });

  it('does not shift the day with the time zone', () => {
    expect(formatDate('2026-12-31')).toBe('31 dic 2026');
  });
});
