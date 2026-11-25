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

export const GOAL_REASONS = ['Travel', 'Vehicle', 'Education', 'EmergencyFund', 'HomePurchase', 'Technology', 'DebtPayment', 'Other'] as const;
export const GOAL_STATUSES = ['Active', 'Completed', 'Cancelled', 'Overdue'] as const;
export type GoalReason = (typeof GOAL_REASONS)[number];
export type GoalStatus = (typeof GOAL_STATUSES)[number];

// Goal as GET /api/goals lists it. The progress comes COMPUTED by the API (it is never stored): `accumulated` is
// the sum of the user's Expense movements in the goal's category between startDate and endDate, not deleted.
// Amounts are decimal strings with two places; `percentage` goes from 0 to 100 and is CAPPED at 100, so a goal
// exceeded is recognised by comparing `accumulated` with `targetAmount`, not by the percentage.
export interface Goal {
  id: string;
  categoryId: string;
  name: string;
  reason: GoalReason;
  reasonOther: string | null;
  targetAmount: string;
  currencyCode: string;
  startDate: string;
  endDate: string;
  status: GoalStatus;
  accumulated: string;
  remaining: string;
  percentage: number;
}

export const ACCOUNT_TYPES =['Savings', 'Checking', 'Credit', 'Other'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

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
