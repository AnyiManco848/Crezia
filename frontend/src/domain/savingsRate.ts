import { toCents } from './money';

// Savings rate = balance / income, as a percentage with one decimal. It is computed only in the front,
// from the summary totals. With no income there is nothing to divide by, so it is not shown (null).
export function savingsRate(totalIncome: string, balance: string): number | null {
  const income = toCents(totalIncome);
  if (income <= 0) return null;
  return Math.round((toCents(balance) / income) * 1000) / 10;
}

// Share of income and expenses in the total moved, for the comparison bar. Both add up to 100.
export function incomeExpenseShare(totalIncome: string, totalExpense: string): { income: number; expense: number } | null {
  const income = toCents(totalIncome);
  const expense = toCents(totalExpense);
  const total = income + expense;
  if (total <= 0) return null;
  const incomePct = Math.round((income / total) * 1000) / 10;
  return { income: incomePct, expense: Math.round((100 - incomePct) * 10) / 10 };
}
