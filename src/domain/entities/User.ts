export type UserRole = 'User' | 'Admin';

// Public shape of a user: never carries the password hash.
export interface User {
  id: string;
  documentId: string;
  name: string;
  email: string;
  role: UserRole;
  preferredCurrencyCode: string;
}

// Only used inside authentication; must never leave the application layer.
export interface UserWithCredentials extends User {
  passwordHash: string;
}

// What the registration hands to the repository. The role is not here: a new user is always `User`.
export interface NewUser {
  documentId: string;
  name: string;
  email: string;
  passwordHash: string;
  // Calendar date "YYYY-MM-DD", like the DATE column.
  birthDate: string;
  phone: string | null;
  preferredCurrencyCode: string;
}

export const MINIMUM_AGE = 18;
export const UNDERAGE_MESSAGE = `Debes tener ${MINIMUM_AGE} años o más`;

// True when the person has completed 18 years on `today`. Calendar dates compared as text ("YYYY-MM-DD"),
// the same rule as the database check chk_users_adult (birth_date <= CURRENT_DATE - 18 years): no time zones.
export function isAdult(birthDate: string, today: Date = new Date()): boolean {
  const year = String(today.getUTCFullYear() - MINIMUM_AGE).padStart(4, '0');
  const month = String(today.getUTCMonth() + 1).padStart(2, '0');
  const day = String(today.getUTCDate()).padStart(2, '0');
  return birthDate <= `${year}-${month}-${day}`;
}
