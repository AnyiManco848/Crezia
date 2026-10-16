export const GOAL_REASONS = [
  'Travel',
  'Vehicle',
  'Education',
  'EmergencyFund',
  'HomePurchase',
  'Technology',
  'DebtPayment',
  'Other',
] as const;
export const GOAL_STATUSES = ['Active', 'Completed', 'Cancelled', 'Overdue'] as const;

export type GoalReason = (typeof GOAL_REASONS)[number];
export type GoalStatus = (typeof GOAL_STATUSES)[number];

// Statuses covered by the partial unique index uq_goals_active_category:
// a user can have only one non-deleted goal in these statuses per category.
export const ACTIVE_GOAL_STATUSES: readonly GoalStatus[] = ['Active', 'Overdue'];

export function isActiveGoalStatus(status: GoalStatus): boolean {
  return ACTIVE_GOAL_STATUSES.includes(status);
}

// No progress column: it is computed from the user's movements (see application/goals/progress.ts).
export interface Goal {
  id: string;
  userId: string;
  categoryId: string;
  name: string;
  reason: GoalReason;
  // Only filled when reason is Other.
  reasonOther: string | null;
  // Decimal string with two places, like NUMERIC(14,2).
  targetAmount: string;
  currencyCode: string;
  // Calendar dates "YYYY-MM-DD", like the DATE columns.
  startDate: string;
  endDate: string;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalProgress {
  // Decimal strings with two places.
  accumulated: string;
  remaining: string;
  // 0 to 100, rounded to two decimals.
  percentage: number;
}

export interface GoalWithProgress extends Goal, GoalProgress {}
