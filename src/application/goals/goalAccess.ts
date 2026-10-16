import type { Goal, GoalReason, GoalWithProgress } from '../../domain/entities/Goal';
import { isPositiveAmount } from '../../domain/entities/Movement';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/errors';
import type { GoalRepository } from '../../domain/repositories/GoalRepository';
import { withProgress } from './progress';

export const GOAL_NOT_FOUND_MESSAGE = 'Meta no encontrada';
export const INVALID_TARGET_AMOUNT_MESSAGE = 'El monto objetivo debe ser mayor que 0';
export const INVALID_DATE_RANGE_MESSAGE = 'La fecha fin debe ser posterior a la fecha inicio';
export const END_DATE_IN_PAST_MESSAGE = 'La fecha fin no puede estar en el pasado';
export const REASON_OTHER_REQUIRED_MESSAGE = 'Describe el motivo cuando el motivo es Other';
export const REASON_OTHER_NOT_ALLOWED_MESSAGE = 'El motivo personalizado solo se permite cuando el motivo es Other';
export const ACTIVE_GOAL_CONFLICT_MESSAGE =
  'Ya tienes una meta activa en esta categoría. Complétala, cancélala o elimínala antes de crear otra';

function invalid(path: string, message: string): ValidationError {
  return new ValidationError(message, [{ path, message }]);
}

// Today's calendar date in the server time zone, "YYYY-MM-DD".
export function todayIsoDate(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// Only the owner can see or change a goal.
// Another user's goal answers 404 so its existence is not revealed.
export async function findOwnedGoal(goals: GoalRepository, id: string, userId: string): Promise<Goal> {
  const goal = await goals.findById(id);
  if (!goal || goal.userId !== userId) {
    throw new NotFoundError(GOAL_NOT_FOUND_MESSAGE);
  }
  return goal;
}

export async function withGoalProgress(goals: GoalRepository, goal: Goal): Promise<GoalWithProgress> {
  const [result] = withProgress([goal], await goals.sumContributions([goal.id]));
  return result!;
}

// Also enforced by the schema and the CHECK (target_amount > 0).
export function ensurePositiveTarget(amount: string): void {
  if (!isPositiveAmount(amount)) throw invalid('body.targetAmount', INVALID_TARGET_AMOUNT_MESSAGE);
}

// Stricter than chk_goals_dates (end_date >= start_date): a goal needs at least two days.
export function ensureDateRange(startDate: string, endDate: string): void {
  if (endDate <= startDate) throw invalid('body.endDate', INVALID_DATE_RANGE_MESSAGE);
}

export function ensureEndDateNotPast(endDate: string, today: string): void {
  if (endDate < today) throw invalid('body.endDate', END_DATE_IN_PAST_MESSAGE);
}

// reasonOther is required with reason Other and must be empty with any other reason.
export function ensureReason(reason: GoalReason, reasonOther: string | null): void {
  if (reason === 'Other' && !reasonOther) throw invalid('body.reasonOther', REASON_OTHER_REQUIRED_MESSAGE);
  if (reason !== 'Other' && reasonOther) throw invalid('body.reasonOther', REASON_OTHER_NOT_ALLOWED_MESSAGE);
}

// Mirrors uq_goals_active_category so the user gets a clear 409 instead of a database error.
export async function ensureNoOtherActiveGoal(
  goals: GoalRepository,
  userId: string,
  categoryId: string,
  excludeId?: string,
): Promise<void> {
  if (await goals.existsActiveInCategory(userId, categoryId, excludeId)) {
    throw new ConflictError(ACTIVE_GOAL_CONFLICT_MESSAGE);
  }
}
