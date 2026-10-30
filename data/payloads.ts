// Reusable valid payloads. Names carry a "PW" prefix and a unique suffix so the data
// created by these tests is easy to spot and never collides between runs.

export function uniqueName(prefix: string): string {
  return `PW ${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Local calendar date "YYYY-MM-DD" moved by `days` (the API compares against the server's local date).
export function isoDate(days = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// A UUID that no record uses.
export const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

export interface CategoryPayload {
  name?: string;
  description?: string | null;
}

export function categoryPayload(overrides: Partial<CategoryPayload> = {}): CategoryPayload {
  return { name: uniqueName('Category'), description: 'Created by Playwright API tests', ...overrides };
}

export interface BankAccountPayload {
  bankName?: string;
  accountAlias?: string | null;
  accountType?: string;
  currencyCode?: string;
}

export function bankAccountPayload(overrides: Partial<BankAccountPayload> = {}): BankAccountPayload {
  return {
    bankName: uniqueName('Bank'),
    accountAlias: 'Playwright',
    accountType: 'Savings',
    currencyCode: 'COP',
    ...overrides,
  };
}

export interface MovementPayload {
  bankAccountId?: string | null;
  categoryId?: string;
  type?: string;
  amount?: string | number;
  currencyCode?: string;
  date?: string;
  paymentMethod?: string;
  description?: string | null;
}

export function movementPayload(overrides: Partial<MovementPayload> = {}): MovementPayload {
  return {
    type: 'Expense',
    amount: '45000.50',
    date: isoDate(),
    paymentMethod: 'DebitCard',
    description: uniqueName('Movement'),
    ...overrides,
  };
}

export interface GoalPayload {
  categoryId?: string;
  name?: string;
  reason?: string;
  reasonOther?: string | null;
  targetAmount?: string | number;
  currencyCode?: string;
  startDate?: string;
  endDate?: string;
}

export function goalPayload(overrides: Partial<GoalPayload> = {}): GoalPayload {
  return {
    name: uniqueName('Goal'),
    reason: 'Travel',
    targetAmount: '1500000.00',
    currencyCode: 'COP',
    startDate: isoDate(),
    endDate: isoDate(365),
    ...overrides,
  };
}
