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

// GET /api/movements/summary. Amounts are decimal strings with two places; balance is negative when
// expenses win. Only movements in `currencyCode` are counted (no exchange rates).
export interface MovementSummary {
  from: string;
  to: string;
  currencyCode: string;
  totalIncome: string;
  totalExpense: string;
  balance: string;
  movementCount: number;
}

export const MOVEMENT_TYPES = ['Income', 'Expense'] as const;
export const PAYMENT_METHODS = ['Cash', 'Transfer', 'CreditCard', 'DebitCard', 'Other'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// A movement as the API lists it (GET /api/movements). amount is always > 0 (a decimal string, "85000.00");
// the type says whether it adds or subtracts. date is a calendar date "YYYY-MM-DD" without time zone.
export interface Movement {
  id: string;
  bankAccountId: string | null;
  categoryId: string;
  type: MovementType;
  amount: string;
  currencyCode: string;
  date: string;
  paymentMethod: PaymentMethod;
  description: string | null;
}

// Category (GET /api/categories). userId is null for the system ones (read-only).
export interface Category {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
}

export type AccountType = 'Savings' | 'Checking' | 'Credit' | 'Other';

// Bank account (GET /api/bank-accounts). The balance is computed by the API.
export interface BankAccount {
  id: string;
  bankName: string;
  accountAlias: string | null;
  accountType: AccountType;
  currencyCode: string;
  balance?: string;
}

export interface Session {
  token: string;
  user: User;
}
