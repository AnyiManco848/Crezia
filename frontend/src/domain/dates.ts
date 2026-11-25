const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

// "2026-11-18" -> "18 nov 2026". A fixed table instead of Intl: browsers disagree on the abbreviations
// ("sept" vs "sep") and the native es-CO pattern adds "de" ("18 de nov de 2026").
// Calendar dates have no time zone, so the text is split, never converted through Date.
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  const name = MONTHS[Number(month) - 1];
  if (!year || !day || !name) return isoDate;
  return `${day} ${name} ${year}`;
}

// Today's calendar date "YYYY-MM-DD" in the person's own time zone (not UTC), like the backend's todayIsoDate.
export function todayIsoDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// True for a real calendar date written as "YYYY-MM-DD" ("2026-02-30" is not).
export function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export const MINIMUM_AGE = 18;
export const UNDERAGE_MESSAGE = `Debes tener ${MINIMUM_AGE} años o más`;

// The latest birth date of a person who has completed 18 years on `today` ("YYYY-MM-DD"). Calendar dates compared as
// text, like the backend (isAdult) and the database check chk_users_adult. The front uses the person's local date;
// the backend uses UTC, so near midnight the API may disagree by one day and its answer wins.
export function latestAdultBirthDate(today: Date = new Date()): string {
  const pad = (n: number, size = 2) => String(n).padStart(size, '0');
  return `${pad(today.getFullYear() - MINIMUM_AGE, 4)}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

export function isAdult(birthDate: string, today: Date = new Date()): boolean {
  return birthDate <= latestAdultBirthDate(today);
}
