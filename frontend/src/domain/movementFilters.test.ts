import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, hasActiveFilters, isRangeInvalid } from './movementFilters';

describe('hasActiveFilters', () => {
  it('is false with no filters and true as soon as one is set', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, type: 'Income' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, from: '2026-11-01' })).toBe(true);
  });
});

describe('isRangeInvalid', () => {
  it('only flags "from" after "to"', () => {
    expect(isRangeInvalid({ from: '2026-11-10', to: '2026-11-01' })).toBe(true);
    expect(isRangeInvalid({ from: '2026-11-01', to: '2026-11-01' })).toBe(false);
    expect(isRangeInvalid({ from: '2026-11-01', to: '2026-11-30' })).toBe(false);
  });

  it('accepts a half-open range', () => {
    expect(isRangeInvalid({ from: '2026-11-10', to: '' })).toBe(false);
    expect(isRangeInvalid({ from: '', to: '2026-11-10' })).toBe(false);
  });
});
