import { describe, expect, it } from 'vitest';
import { formatDate, isAdult, isRealIsoDate, latestAdultBirthDate, todayIsoDate } from './dates';

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

describe('todayIsoDate', () => {
  it('uses the local calendar date with zero padding', () => {
    expect(todayIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(todayIsoDate(new Date(2026, 10, 22, 0, 1))).toBe('2026-11-22');
  });
});

describe('isAdult', () => {
  const today = new Date(2026, 10, 22); // 22 Nov 2026

  it('is true from the 18th birthday on, and false the day before', () => {
    expect(isAdult('2008-11-22', today)).toBe(true);
    expect(isAdult('2008-11-23', today)).toBe(false);
    expect(isAdult('2000-01-01', today)).toBe(true);
    expect(isAdult('2026-11-22', today)).toBe(false);
  });

  it('gives the latest adult birth date for the date input max', () => {
    expect(latestAdultBirthDate(today)).toBe('2008-11-22');
  });
});

describe('isRealIsoDate', () => {
  it('accepts real dates and rejects impossible or badly formatted ones', () => {
    expect(isRealIsoDate('2028-02-29')).toBe(true);
    expect(isRealIsoDate('2026-02-29')).toBe(false);
    expect(isRealIsoDate('2026-02-30')).toBe(false);
    expect(isRealIsoDate('2026-13-01')).toBe(false);
    expect(isRealIsoDate('26-1-1')).toBe(false);
    expect(isRealIsoDate('')).toBe(false);
  });
});
