import type { BankAccount, BankAccountWithBalance } from '../../domain/entities/BankAccount';
import type { MovementType } from '../../domain/entities/Movement';
import type { MovementTotal } from '../../domain/repositories/BankAccountRepository';
import { fromCents, toCents } from '../money';

export interface BalanceEntry {
  type: MovementType;
  // Decimal string with up to two places, as NUMERIC(14,2) arrives from the database.
  amount: string;
  deletedAt?: Date | null;
}

// Balance = sum of Income - sum of Expense, ignoring soft-deleted entries.
export function computeBalance(entries: readonly BalanceEntry[]): string {
  let cents = 0;
  for (const entry of entries) {
    if (entry.deletedAt) continue;
    const value = toCents(entry.amount);
    cents += entry.type === 'Income' ? value : -value;
  }
  return fromCents(cents);
}

// Joins the grouped totals of sumMovementsByAccount with their accounts.
export function withBalances(accounts: BankAccount[], totals: readonly MovementTotal[]): BankAccountWithBalance[] {
  const byAccount = new Map<string, MovementTotal[]>();
  for (const total of totals) {
    const group = byAccount.get(total.bankAccountId) ?? [];
    group.push(total);
    byAccount.set(total.bankAccountId, group);
  }
  return accounts.map((account) => ({ ...account, balance: computeBalance(byAccount.get(account.id) ?? []) }));
}
