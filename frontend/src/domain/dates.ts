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
