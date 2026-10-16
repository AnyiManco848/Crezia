export const MOVEMENT_TYPES = ['Income', 'Expense'] as const;
export const PAYMENT_METHODS = ['Cash', 'Transfer', 'CreditCard', 'DebitCard', 'Other'] as const;
export const MOVEMENT_SOURCES = ['Manual', 'EmailParsed'] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type MovementSource = (typeof MOVEMENT_SOURCES)[number];

// amount is always > 0; the type says whether it adds to or subtracts from the balance.
// bankAccountId is null for movements outside any account (e.g. cash).
export interface Movement {
  id: string;
  userId: string;
  bankAccountId: string | null;
  categoryId: string;
  type: MovementType;
  // Decimal string with two places (e.g. "85000.00"), like NUMERIC(14,2).
  amount: string;
  currencyCode: string;
  // Calendar date without time zone, "YYYY-MM-DD", like the DATE column.
  date: string;
  paymentMethod: PaymentMethod;
  source: MovementSource;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const POSITIVE_AMOUNT = /^\d+(?:\.\d{1,2})?$/;

// True for a decimal string greater than zero with at most two decimal places.
export function isPositiveAmount(amount: string): boolean {
  return POSITIVE_AMOUNT.test(amount) && /[1-9]/.test(amount);
}
