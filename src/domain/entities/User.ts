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
