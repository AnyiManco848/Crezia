import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateGoalUseCase, type CreateGoalInput } from '../../../src/application/goals/CreateGoalUseCase';
import { DeleteGoalUseCase } from '../../../src/application/goals/DeleteGoalUseCase';
import { GetGoalUseCase } from '../../../src/application/goals/GetGoalUseCase';
import {
  ACTIVE_GOAL_CONFLICT_MESSAGE,
  END_DATE_IN_PAST_MESSAGE,
  INVALID_DATE_RANGE_MESSAGE,
  INVALID_TARGET_AMOUNT_MESSAGE,
  REASON_OTHER_NOT_ALLOWED_MESSAGE,
  REASON_OTHER_REQUIRED_MESSAGE,
  todayIsoDate,
} from '../../../src/application/goals/goalAccess';
import { ListGoalsUseCase } from '../../../src/application/goals/ListGoalsUseCase';
import { UpdateGoalUseCase } from '../../../src/application/goals/UpdateGoalUseCase';
import { INVALID_CATEGORY_MESSAGE } from '../../../src/application/movements/movementAccess';
import { ConflictError, NotFoundError, ValidationError } from '../../../src/domain/errors';
import { InMemoryCurrencyRepository } from '../../helpers/InMemoryBankAccountRepository';
import { InMemoryCategoryRepository, type StoredCategory } from '../../helpers/InMemoryCategoryRepository';
import { InMemoryGoalRepository, type StoredGoal } from '../../helpers/InMemoryGoalRepository';

const ME = 'user-1';
const OTHER = 'user-2';
const TODAY = '2026-10-16';

describe('goal use cases', () => {
  let goals: InMemoryGoalRepository;
  let categories: InMemoryCategoryRepository;
  let currencies: InMemoryCurrencyRepository;
  let savings: StoredCategory;
  let travel: StoredCategory;
  let myCategory: StoredCategory;
  let othersCategory: StoredCategory;
  let deletedCategory: StoredCategory;
  let mine: StoredGoal;
  let others: StoredGoal;

  const create = () => new CreateGoalUseCase(goals, categories, currencies, () => TODAY);
  const update = () => new UpdateGoalUseCase(goals, categories, currencies);

  beforeEach(() => {
    goals = new InMemoryGoalRepository();
    categories = new InMemoryCategoryRepository();
    currencies = new InMemoryCurrencyRepository();

    savings = categories.seed({ name: 'Ahorro', isDefault: true });
    travel = categories.seed({ name: 'Viajes', isDefault: true });
    myCategory = categories.seed({ name: 'Moto', userId: ME });
    othersCategory = categories.seed({ name: 'Ajena', userId: OTHER });
    deletedCategory = categories.seed({ name: 'Borrada', userId: ME, deletedAt: new Date(), deletedBy: ME });

    mine = goals.seed({ userId: ME, categoryId: savings.id, name: 'Viaje a Cartagena' });
    others = goals.seed({ userId: OTHER, categoryId: othersCategory.id });

    goals.addMovement({ userId: ME, categoryId: savings.id, type: 'Expense', amount: '400000', date: '2026-10-05' });
  });

  describe('ListGoalsUseCase', () => {
    it('returns only own non-deleted goals with their progress in one totals query', async () => {
      const empty = goals.seed({ userId: ME, categoryId: travel.id, targetAmount: '100.00' });
      goals.seed({ userId: ME, categoryId: myCategory.id, deletedAt: new Date(), deletedBy: ME });

      const result = await new ListGoalsUseCase(goals).execute(ME);

      expect(result.data.map((g) => [g.id, g.accumulated, g.remaining, g.percentage])).toEqual([
        [mine.id, '400000.00', '1600000.00', 20],
        [empty.id, '0.00', '100.00', 0],
      ]);
      expect(result).toMatchObject({ page: 1, limit: 50, total: 2 });
      expect(goals.sumCalls).toBe(1);
    });

    it('returns the requested page, the total of all pages and progress only for that page', async () => {
      const empty = goals.seed({ userId: ME, categoryId: travel.id, targetAmount: '100.00' });

      const result = await new ListGoalsUseCase(goals).execute(ME, { page: 2, limit: 1 });

      expect(result.data.map((g) => g.id)).toEqual([empty.id]);
      expect(result).toMatchObject({ page: 2, limit: 1, total: 2 });
      expect(goals.sumCalls).toBe(1);
    });

    it('does not query totals when the user has no goals', async () => {
      expect(await new ListGoalsUseCase(goals).execute('nobody')).toEqual({ data: [], page: 1, limit: 50, total: 0 });
      expect(goals.sumCalls).toBe(0);
    });
  });

  describe('GetGoalUseCase', () => {
    it('returns an own goal with its progress', async () => {
      const result = await new GetGoalUseCase(goals).execute(mine.id, ME);

      expect(result).toMatchObject({ id: mine.id, accumulated: '400000.00', percentage: 20 });
    });

    it('throws NotFoundError for another user goal', async () => {
      await expect(new GetGoalUseCase(goals).execute(others.id, ME)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('CreateGoalUseCase', () => {
    let input: CreateGoalInput;

    beforeEach(() => {
      input = {
        categoryId: travel.id,
        name: 'Viaje a Japón',
        reason: 'Travel',
        targetAmount: '15000000',
        currencyCode: 'COP',
        startDate: '2026-10-01',
        endDate: '2027-12-31',
      };
    });

    it('creates an Active goal owned by the authenticated user with audit fields and progress', async () => {
      const result = await create().execute(input, ME);

      expect(result).toMatchObject({ ...input, userId: ME, status: 'Active', reasonOther: null, percentage: 0 });
      const stored = goals.rows.find((r) => r.id === result.id)!;
      expect(stored).toMatchObject({ createdBy: ME, updatedBy: ME });
    });

    it('ignores userId and status sent in the input', async () => {
      const tricky = { ...input, userId: OTHER, status: 'Completed' } as unknown as CreateGoalInput;

      expect(await create().execute(tricky, ME)).toMatchObject({ userId: ME, status: 'Active' });
    });

    it.each(['0', '0.00', '-1'])('rejects targetAmount %s', async (targetAmount) => {
      const attempt = create().execute({ ...input, targetAmount }, ME);

      await expect(attempt).rejects.toBeInstanceOf(ValidationError);
      await expect(attempt).rejects.toThrow(INVALID_TARGET_AMOUNT_MESSAGE);
    });

    it.each([
      ['equal to', '2026-10-01'],
      ['before', '2026-09-30'],
    ])('rejects an end date %s the start date', async (_label, endDate) => {
      await expect(create().execute({ ...input, endDate }, ME)).rejects.toThrow(INVALID_DATE_RANGE_MESSAGE);
    });

    it('rejects an end date in the past and accepts today', async () => {
      const past = { ...input, startDate: '2026-01-01', endDate: '2026-10-15' };

      await expect(create().execute(past, ME)).rejects.toThrow(END_DATE_IN_PAST_MESSAGE);
      await expect(create().execute({ ...past, endDate: TODAY }, ME)).resolves.toBeDefined();
    });

    it('accepts a system category and an own category', async () => {
      await expect(create().execute(input, ME)).resolves.toBeDefined();
      await expect(create().execute({ ...input, categoryId: myCategory.id }, ME)).resolves.toBeDefined();
    });

    it.each([
      ['another user', () => othersCategory.id],
      ['a deleted', () => deletedCategory.id],
    ])('rejects %s category with ValidationError', async (_label, categoryId) => {
      const attempt = create().execute({ ...input, categoryId: categoryId() }, ME);

      await expect(attempt).rejects.toBeInstanceOf(ValidationError);
      await expect(attempt).rejects.toThrow(INVALID_CATEGORY_MESSAGE);
    });

    it('rejects an unknown currency', async () => {
      await expect(create().execute({ ...input, currencyCode: 'XYZ' }, ME)).rejects.toBeInstanceOf(ValidationError);
    });

    it('requires reasonOther with reason Other and rejects it with any other reason', async () => {
      await expect(create().execute({ ...input, reason: 'Other' }, ME)).rejects.toThrow(REASON_OTHER_REQUIRED_MESSAGE);
      await expect(create().execute({ ...input, reasonOther: 'Algo' }, ME)).rejects.toThrow(
        REASON_OTHER_NOT_ALLOWED_MESSAGE,
      );
      const result = await create().execute({ ...input, reason: 'Other', reasonOther: 'Boda' }, ME);
      expect(result).toMatchObject({ reason: 'Other', reasonOther: 'Boda' });
    });

    it('rejects a second active goal in the same category with ConflictError', async () => {
      const spy = vi.spyOn(goals, 'create');

      const attempt = create().execute({ ...input, categoryId: savings.id }, ME);

      await expect(attempt).rejects.toBeInstanceOf(ConflictError);
      await expect(attempt).rejects.toThrow(ACTIVE_GOAL_CONFLICT_MESSAGE);
      expect(spy).not.toHaveBeenCalled();
    });

    it('treats an Overdue goal as active, like the partial unique index', async () => {
      mine.status = 'Overdue';

      await expect(create().execute({ ...input, categoryId: savings.id }, ME)).rejects.toBeInstanceOf(ConflictError);
    });

    it.each(['deleted', 'Completed', 'Cancelled'])('allows a new goal when the previous one is %s', async (state) => {
      if (state === 'deleted') Object.assign(mine, { deletedAt: new Date(), deletedBy: ME });
      else mine.status = state as StoredGoal['status'];

      await expect(create().execute({ ...input, categoryId: savings.id }, ME)).resolves.toBeDefined();
    });

    it('does not conflict with another user goal in the same category', async () => {
      goals.seed({ userId: OTHER, categoryId: travel.id });

      await expect(create().execute(input, ME)).resolves.toBeDefined();
    });

    it('starts with the contributions already recorded in its category and range', async () => {
      Object.assign(mine, { deletedAt: new Date(), deletedBy: ME });

      const result = await create().execute({ ...input, categoryId: savings.id, targetAmount: '800000' }, ME);

      expect(result).toMatchObject({ accumulated: '400000.00', percentage: 50 });
    });
  });

  describe('UpdateGoalUseCase', () => {
    it('partially updates an own goal, sets updatedBy and returns the progress', async () => {
      const result = await update().execute(mine.id, { targetAmount: '800000' }, ME);

      expect(result).toMatchObject({ name: 'Viaje a Cartagena', targetAmount: '800000', percentage: 50 });
      expect(mine.updatedBy).toBe(ME);
    });

    it('throws NotFoundError for another user goal', async () => {
      const spy = vi.spyOn(goals, 'update');

      await expect(update().execute(others.id, { name: 'Mía' }, ME)).rejects.toBeInstanceOf(NotFoundError);
      expect(spy).not.toHaveBeenCalled();
    });

    it('rejects targetAmount <= 0 and an invalid date range against the stored dates', async () => {
      await expect(update().execute(mine.id, { targetAmount: '0' }, ME)).rejects.toThrow(INVALID_TARGET_AMOUNT_MESSAGE);
      await expect(update().execute(mine.id, { endDate: '2026-09-01' }, ME)).rejects.toThrow(
        INVALID_DATE_RANGE_MESSAGE,
      );
      await expect(update().execute(mine.id, { startDate: '2027-05-01' }, ME)).rejects.toThrow(
        INVALID_DATE_RANGE_MESSAGE,
      );
    });

    it('rejects a category of another user or deleted', async () => {
      await expect(update().execute(mine.id, { categoryId: othersCategory.id }, ME)).rejects.toThrow(
        INVALID_CATEGORY_MESSAGE,
      );
      await expect(update().execute(mine.id, { categoryId: deletedCategory.id }, ME)).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('rejects moving an active goal to a category that already has one', async () => {
      goals.seed({ userId: ME, categoryId: travel.id });

      const attempt = update().execute(mine.id, { categoryId: travel.id }, ME);

      await expect(attempt).rejects.toBeInstanceOf(ConflictError);
      expect(mine.categoryId).toBe(savings.id);
    });

    it('rejects reactivating a goal when its category already has an active one', async () => {
      const old = goals.seed({ userId: ME, categoryId: savings.id, status: 'Cancelled' });

      await expect(update().execute(old.id, { status: 'Active' }, ME)).rejects.toThrow(ACTIVE_GOAL_CONFLICT_MESSAGE);
    });

    it('allows editing an active goal without touching category or status', async () => {
      await expect(update().execute(mine.id, { name: 'Cartagena 2027' }, ME)).resolves.toMatchObject({
        name: 'Cartagena 2027',
      });
    });

    it('allows completing a goal and then creating another in the category', async () => {
      await update().execute(mine.id, { status: 'Completed' }, ME);

      const goal = goals.seed({ userId: ME, categoryId: travel.id, status: 'Cancelled' });
      await expect(update().execute(goal.id, { categoryId: savings.id, status: 'Active' }, ME)).resolves.toBeDefined();
    });

    it('validates reason and reasonOther against the stored values', async () => {
      await expect(update().execute(mine.id, { reason: 'Other' }, ME)).rejects.toThrow(REASON_OTHER_REQUIRED_MESSAGE);
      await expect(update().execute(mine.id, { reasonOther: 'Boda' }, ME)).rejects.toThrow(
        REASON_OTHER_NOT_ALLOWED_MESSAGE,
      );

      await update().execute(mine.id, { reason: 'Other', reasonOther: 'Boda' }, ME);
      expect(mine).toMatchObject({ reason: 'Other', reasonOther: 'Boda' });
    });

    it('clears reasonOther when switching away from Other', async () => {
      Object.assign(mine, { reason: 'Other', reasonOther: 'Boda' });

      const result = await update().execute(mine.id, { reason: 'Vehicle' }, ME);

      expect(result).toMatchObject({ reason: 'Vehicle', reasonOther: null });
    });
  });

  describe('DeleteGoalUseCase', () => {
    it('soft deletes an own goal filling deletedAt, deletedBy and updatedBy', async () => {
      await new DeleteGoalUseCase(goals).execute(mine.id, ME);

      expect(mine.deletedAt).toBeInstanceOf(Date);
      expect(mine).toMatchObject({ deletedBy: ME, updatedBy: ME });
      expect(goals.rows).toContain(mine);
      expect(await goals.findById(mine.id)).toBeNull();
    });

    it('throws NotFoundError for another user goal', async () => {
      const spy = vi.spyOn(goals, 'softDelete');

      await expect(new DeleteGoalUseCase(goals).execute(others.id, ME)).rejects.toBeInstanceOf(NotFoundError);
      expect(spy).not.toHaveBeenCalled();
      expect(others.deletedAt).toBeNull();
    });
  });

  describe('todayIsoDate', () => {
    it('formats the local calendar date', () => {
      expect(todayIsoDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    });
  });
});
