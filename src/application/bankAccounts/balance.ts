import type { BankAccount, BankAccountWithBalance } from '../../domain/entities/BankAccount';
import type { MovementType } from '../../domain/entities/Movement';
import type { MovementTotal } from '../../domain/repositories/BankAccountRepository';

export interface BalanceEntry {
  type: MovementType;
  // Decimal string with up to two places, as NUMERIC(14,2) arrives from the database.
  amount: string;
  deletedAt?: Date | null;
}

const AMOUNT = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

// Money is added in integer cents to avoid floating point errors (0.1 + 0.2).
// NUMERIC(14,2) fits well inside Number.MAX_SAFE_INTEGER once expressed in cents.
function toCents(amount: string): number {
  const match = AMOUNT.exec(amount.trim());
  if (!match) throw new Error(`Invalid amount: ${amount}`);
  const [, sign, whole, fraction = ''] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return sign ? -cents : cents;
}

function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
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
