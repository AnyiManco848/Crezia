import type { GoalReason, GoalWithProgress } from '../../domain/entities/Goal';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import type { CurrencyRepository } from '../../domain/repositories/CurrencyRepository';
import type { GoalRepository } from '../../domain/repositories/GoalRepository';
import { ensureActiveCurrency } from '../bankAccounts/bankAccountAccess';
import { ensureUsableCategory } from '../movements/movementAccess';
import {
  ensureDateRange,
  ensureEndDateNotPast,
  ensureNoOtherActiveGoal,
  ensurePositiveTarget,
  ensureReason,
  todayIsoDate,
  withGoalProgress,
} from './goalAccess';

export interface CreateGoalInput {
  categoryId: string;
  name: string;
  reason: GoalReason;
  reasonOther?: string | null;
  targetAmount: string;
  currencyCode: string;
  startDate: string;
  endDate: string;
}

export class CreateGoalUseCase {
  constructor(
    private readonly goals: GoalRepository,
    private readonly categories: CategoryRepository,
    private readonly currencies: CurrencyRepository,
    // Injected so tests do not depend on the real date.
    private readonly today: () => string = todayIsoDate,
  ) {}

  // Only the explicit fields are copied: the owner is always the authenticated user
  // and a new goal always starts Active.
  async execute(
    { categoryId, name, reason, reasonOther, targetAmount, currencyCode, startDate, endDate }: CreateGoalInput,
    userId: string,
  ): Promise<GoalWithProgress> {
    ensurePositiveTarget(targetAmount);
    ensureDateRange(startDate, endDate);
    ensureEndDateNotPast(endDate, this.today());
    ensureReason(reason, reasonOther ?? null);
    // The three checks are independent reads, so they run together; the first failure in this
    // order is the one reported, exactly as if they ran one after another.
    const checks = await Promise.allSettled([
      ensureUsableCategory(this.categories, categoryId, userId),
      ensureActiveCurrency(this.currencies, currencyCode),
      ensureNoOtherActiveGoal(this.goals, userId, categoryId),
    ]);
    for (const check of checks) {
      if (check.status === 'rejected') throw check.reason;
    }

    const goal = await this.goals.create({
      userId,
      categoryId,
      name,
      reason,
      reasonOther: reasonOther ?? null,
      targetAmount,
      currencyCode,
      startDate,
      endDate,
      status: 'Active',
      createdBy: userId,
      updatedBy: userId,
    });
    // Unlike a new bank account, a new goal can start with progress: movements already
    // recorded in its category and date range count toward it.
    return withGoalProgress(this.goals, goal);
  }
}
