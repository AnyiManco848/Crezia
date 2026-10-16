import type { Goal, GoalProgress, GoalWithProgress } from '../../domain/entities/Goal';
import type { MovementType } from '../../domain/entities/Movement';
import type { GoalTotal } from '../../domain/repositories/GoalRepository';
import { fromCents, toCents } from '../money';

export interface ContributionEntry {
  userId: string;
  categoryId: string;
  type: MovementType;
  // Decimal string with up to two places.
  amount: string;
  // "YYYY-MM-DD"
  date: string;
  deletedAt?: Date | null;
}

// Saving toward a goal is recorded as an Expense in the goal's category.
// A movement counts when it is the owner's, not deleted, an Expense in that category
// and dated between start_date and end_date (both inclusive).
// PrismaGoalRepository.sumContributions applies the same rule in SQL.
export function isGoalContribution(goal: Goal, entry: ContributionEntry): boolean {
  return (
    !entry.deletedAt &&
    entry.userId === goal.userId &&
    entry.categoryId === goal.categoryId &&
    entry.type === 'Expense' &&
    entry.date >= goal.startDate &&
    entry.date <= goal.endDate
  );
}

// remaining = target - accumulated (never below 0); percentage = accumulated / target * 100,
// capped at 100 and rounded to two decimals. Everything in integer cents.
export function computeGoalProgress(targetAmount: string, accumulated: string): GoalProgress {
  const targetCents = toCents(targetAmount);
  const accumulatedCents = toCents(accumulated);
  const remainingCents = Math.max(0, targetCents - accumulatedCents);
  // target_amount > 0 is guaranteed by the CHECK constraint; the guard only avoids a division by 0.
  const percentage =
    targetCents > 0 ? Math.min(100, Math.round((accumulatedCents * 10000) / targetCents) / 100) : 0;
  return { accumulated: fromCents(accumulatedCents), remaining: fromCents(remainingCents), percentage };
}

// Progress of one goal straight from a list of movements.
export function progressFromMovements(goal: Goal, entries: readonly ContributionEntry[]): GoalProgress {
  let cents = 0;
  for (const entry of entries) {
    if (isGoalContribution(goal, entry)) cents += toCents(entry.amount);
  }
  return computeGoalProgress(goal.targetAmount, fromCents(cents));
}

// Joins the totals of sumContributions with their goals.
export function withProgress(goals: Goal[], totals: readonly GoalTotal[]): GoalWithProgress[] {
  const byGoal = new Map(totals.map((total) => [total.goalId, total.amount]));
  return goals.map((goal) => ({ ...goal, ...computeGoalProgress(goal.targetAmount, byGoal.get(goal.id) ?? '0') }));
}
