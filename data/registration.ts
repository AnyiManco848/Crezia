import { randomBytes } from 'node:crypto';
import { E2E_DOCUMENT_PREFIX, E2E_EMAIL_DOMAIN } from '../utils/testDb';

export interface RegisterPayload {
  name?: string;
  documentId?: string;
  birthDate?: string;
  email?: string;
  phone?: string | null;
  password?: string;
  preferredCurrencyCode?: string;
  [extra: string]: unknown;
}

// Document ids and emails are random and carry the e2e markers, so the cleanup deletes exactly these users.
export function registerPayload(overrides: RegisterPayload = {}): RegisterPayload {
  const suffix = randomBytes(5).toString('hex');
  return {
    name: 'PW Registro Prueba',
    documentId: `${E2E_DOCUMENT_PREFIX}${suffix}`,
    birthDate: '1995-03-10',
    email: `reg-${suffix}${E2E_EMAIL_DOMAIN}`,
    password: 'Clave1234',
    ...overrides,
  };
}

// "YYYY-MM-DD" for a person who turns `years` old `daysFromBirthday` days from today (negative = already did).
export function birthDateForAge(years: number, daysFromBirthday = 0): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  date.setUTCDate(date.getUTCDate() + daysFromBirthday);
  return date.toISOString().slice(0, 10);
}
