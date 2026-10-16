export const ACCOUNT_TYPES = ['Savings', 'Checking', 'Credit', 'Other'] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

// No balance column: it is computed from the account's movements (see application/bankAccounts/balance.ts).
export interface BankAccount {
  id: string;
  userId: string;
  bankName: string;
  accountAlias: string | null;
  accountType: AccountType;
  currencyCode: string;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Balance as a decimal string with two places (e.g. "1803000.00"), like NUMERIC(14,2).
export interface BankAccountWithBalance extends BankAccount {
  balance: string;
}
