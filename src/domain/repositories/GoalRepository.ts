import type { Goal, GoalReason, GoalStatus } from '../entities/Goal';
import type { SoftDeleteData } from './CategoryRepository';

export type { SoftDeleteData };

export interface CreateGoalData {
  userId: string;
  categoryId: string;
  name: string;
  reason: GoalReason;
  reasonOther: string | null;
  targetAmount: string;
  currencyCode: string;
  startDate: string;
  endDate: string;
  status: GoalStatus;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateGoalData {
  categoryId?: string;
  name?: string;
  reason?: GoalReason;
  reasonOther?: string | null;
  targetAmount?: string;
  currencyCode?: string;
  startDate?: string;
  endDate?: string;
  status?: GoalStatus;
  updatedBy: string;
}

// Accumulated contributions of one goal. amount is a decimal string (e.g. "400000.00").
export interface GoalTotal {
  goalId: string;
  amount: string;
}

// Every read ignores soft-deleted goals.
export interface GoalRepository {
  listByUser(userId: string): Promise<Goal[]>;
  // Any owner; access rules are applied by the use cases.
  findById(id: string): Promise<Goal | null>;
  // Throws ConflictError when the partial unique index rejects the row (concurrent requests).
  create(data: CreateGoalData): Promise<Goal>;
  update(id: string, data: UpdateGoalData): Promise<Goal>;
  softDelete(id: string, data: SoftDeleteData): Promise<void>;
  // True when the user has another non-deleted goal with an active status in the category.
  existsActiveInCategory(userId: string, categoryId: string, excludeId?: string): Promise<boolean>;
  // One query for all the given goals, applying the rule of isGoalContribution (application/goals/progress.ts).
  // Goals without contributions have no row.
  sumContributions(goalIds: string[]): Promise<GoalTotal[]>;
}
