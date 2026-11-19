export const PERIODS = [
  { key: 'thisMonth', label: 'Este mes' },
  { key: 'prevMonth', label: 'Mes anterior' },
  { key: 'last30', label: 'Últimos 30 días' },
  { key: 'thisYear', label: 'Este año' },
] as const;

export type PeriodKey = (typeof PERIODS)[number]['key'];

export const DEFAULT_PERIOD: PeriodKey = 'thisMonth';

export interface DateRange {
  // Inclusive "YYYY-MM-DD" dates, as the API expects.
  from: string;
  to: string;
}

// Built from the local calendar parts (never toISOString, which would shift the day with the time zone).
function iso(year: number, month: number, day: number): string {
  const date = new Date(year, month, day);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${String(date.getFullYear()).padStart(4, '0')}-${mm}-${dd}`;
}

// The four periods always fit in the API limit of 366 days.
export function getPeriodRange(key: PeriodKey, now: Date = new Date()): DateRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (key) {
    case 'prevMonth':
      return { from: iso(y, m - 1, 1), to: iso(y, m, 0) };
    case 'last30':
      return { from: iso(y, m, d - 29), to: iso(y, m, d) };
    case 'thisYear':
      return { from: iso(y, 0, 1), to: iso(y, 11, 31) };
    case 'thisMonth':
      return { from: iso(y, m, 1), to: iso(y, m + 1, 0) };
  }
}

export function isPeriodKey(value: string): value is PeriodKey {
  return PERIODS.some((period) => period.key === value);
}
