import { describe, expect, it } from 'vitest';
import { isAdult } from '../../src/domain/entities/User';

const TODAY = new Date('2026-11-18T03:00:00Z');

describe('isAdult', () => {
  it('is true on the 18th birthday and false the day before it', () => {
    expect(isAdult('2008-11-18', TODAY)).toBe(true);
    expect(isAdult('2008-11-19', TODAY)).toBe(false);
  });

  it('handles a Feb 29 birthday', () => {
    expect(isAdult('2008-02-29', new Date('2026-03-01T00:00:00Z'))).toBe(true);
    expect(isAdult('2008-03-01', new Date('2026-02-28T00:00:00Z'))).toBe(false);
  });
});
