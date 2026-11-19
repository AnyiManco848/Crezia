import { describe, expect, it } from 'vitest';
import { DAILY_MESSAGES, dailyMessage, dayOfYear } from './dailyMessage';

describe('dayOfYear', () => {
  it('counts January 1 as day 1', () => {
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
  });

  it('knows the end of a normal and of a leap year', () => {
    expect(dayOfYear(new Date(2026, 11, 31))).toBe(365);
    expect(dayOfYear(new Date(2028, 11, 31))).toBe(366);
  });

  it('uses the local calendar day, whatever the time', () => {
    expect(dayOfYear(new Date(2026, 10, 18, 0, 0, 1))).toBe(322);
    expect(dayOfYear(new Date(2026, 10, 18, 23, 59, 59))).toBe(322);
  });
});

describe('dailyMessage', () => {
  it('has the 30 approved phrases', () => {
    expect(DAILY_MESSAGES).toHaveLength(30);
    expect(new Set(DAILY_MESSAGES).size).toBe(30);
  });

  it('picks the phrase at (day of the year) modulo 30', () => {
    // Day 1 -> index 1; day 30 -> index 0; day 31 -> index 1.
    expect(dailyMessage(new Date(2026, 0, 1))).toBe(DAILY_MESSAGES[1]);
    expect(dailyMessage(new Date(2026, 0, 30))).toBe(DAILY_MESSAGES[0]);
    expect(dailyMessage(new Date(2026, 0, 31))).toBe(DAILY_MESSAGES[1]);
    // 2026-11-18 is day 322 -> 322 % 30 = 22.
    expect(dailyMessage(new Date(2026, 10, 18))).toBe(DAILY_MESSAGES[22]);
  });

  it('is the same all day and changes the next day', () => {
    const morning = dailyMessage(new Date(2026, 5, 10, 6, 0));
    expect(dailyMessage(new Date(2026, 5, 10, 22, 0))).toBe(morning);
    expect(dailyMessage(new Date(2026, 5, 11, 6, 0))).not.toBe(morning);
  });

  it('repeats every 30 days', () => {
    expect(dailyMessage(new Date(2026, 2, 5))).toBe(dailyMessage(new Date(2026, 3, 4)));
  });
});
