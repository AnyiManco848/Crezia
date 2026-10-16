import {
  isActiveGoalStatus,
  type GoalReason,
  type GoalStatus,
  type GoalWithProgress,
} from '../../domain/entities/Goal';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import type { CurrencyRepository } from '../../domain/repositories/CurrencyRepository';
import type { GoalRepository } from '../../domain/repositories/GoalRepository';
import { ensureActiveCurrency } from '../bankAccounts/bankAccountAccess';
import { ensureUsableCategory } from '../movements/movementAccess';
import {
  ensureDateRange,
  ensureNoOtherActiveGoal,
  ensurePositiveTarget,
  ensureReason,
  findOwnedGoal,
  withGoalProgress,
} from './goalAccess';

export interface UpdateGoalInput {
  categoryId?: string;
  name?: string;
  reason?: GoalReason;
  reasonOther?: string | null;
  targetAmount?: string;
  currencyCode?: string;
  startDate?: string;
  endDate?: string;
  status?: GoalStatus;
}

export class UpdateGoalUseCase {
  constructor(
    private readonly goals: GoalRepository,
    private readonly categories: CategoryRepository,
    private readonly currencies: CurrencyRepository,
  ) {}

  async execute(id: string, input: UpdateGoalInput, userId: string): Promise<GoalWithProgress> {
    const current = await findOwnedGoal(this.goals, id, userId);
    const { categoryId, name, reason, targetAmount, currencyCode, startDate, endDate, status } = input;

    if (targetAmount !== undefined) ensurePositiveTarget(targetAmount);
    // The rules apply to the goal as it will be stored, mixing the sent fields with the current ones.
    // The end date may already be in the past here: that check is only for new goals.
    if (startDate !== undefined || endDate !== undefined) {
      ensureDateRange(startDate ?? current.startDate, endDate ?? current.endDate);
    }

    let reasonOther = input.reasonOther;
    if (reason !== undefined || reasonOther !== undefined) {
      const nextReason = reason ?? current.reason;
      // Switching away from Other clears the old description unless a new one is sent.
      if (reasonOther === undefined) reasonOther = nextReason === 'Other' ? current.reasonOther : null;
      ensureReason(nextReason, reasonOther);
    }

    const categoryChanged = categoryId !== undefined && categoryId !== current.categoryId;
    if (categoryChanged) await ensureUsableCategory(this.categories, categoryId, userId);
    if (currencyCode !== undefined && currencyCode !== current.currencyCode) {
      await ensureActiveCurrency(this.currencies, currencyCode);
    }

    // Only when the goal becomes active, or an active goal moves to another category.
    const nextStatus = status ?? current.status;
    if (isActiveGoalStatus(nextStatus) && (categoryChanged || !isActiveGoalStatus(current.status))) {
      await ensureNoOtherActiveGoal(this.goals, userId, categoryId ?? current.categoryId, id);
    }

    const goal = await this.goals.update(id, {
      categoryId,
      name,
      reason,
      reasonOther,
      targetAmount,
      currencyCode,
      startDate,
      endDate,
      status,
      updatedBy: userId,
    });
    return withGoalProgress(this.goals, goal);
  }
}
