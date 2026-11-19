import type { MovementType } from './types';

// Filters of the movements list. An empty string means "no filter".
export interface MovementFilters {
  type: '' | MovementType;
  categoryId: string;
  bankAccountId: string;
  from: string;
  to: string;
}

export const EMPTY_FILTERS: MovementFilters = { type: '', categoryId: '', bankAccountId: '', from: '', to: '' };

export const RANGE_ERROR = 'La fecha "Desde" no puede ser posterior a "Hasta"';

export function hasActiveFilters(filters: MovementFilters): boolean {
  return Object.values(filters).some((value) => value !== '');
}

// "YYYY-MM-DD" strings compare correctly as text. An invalid range is never sent to the API (it answers 400).
export function isRangeInvalid({ from, to }: Pick<MovementFilters, 'from' | 'to'>): boolean {
  return from !== '' && to !== '' && from > to;
}
