// Types aligned with the backend (src/domain/entities and the login response). Add each resource here
// when its screen is built.

export type UserRole = 'User' | 'Admin';

// Public shape of a user, as returned by POST /api/auth/login (never carries the password hash).
export interface User {
  id: string;
  documentId: string;
  name: string;
  email: string;
  role: UserRole;
  preferredCurrencyCode: string;
}

export interface Session {
  token: string;
  user: User;
}
