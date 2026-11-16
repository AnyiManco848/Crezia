import { beforeEach, describe, expect, it } from 'vitest';
import {
  GetMovementSummaryUseCase,
  INVALID_PERIOD_MESSAGE,
  MAX_PERIOD_DAYS,
  PERIOD_TOO_LONG_MESSAGE,
  periodDays,
} from '../../../src/application/movements/GetMovementSummaryUseCase';
import { ValidationError } from '../../../src/domain/errors';
import { InMemoryMovementRepository, type StoredMovement } from '../../helpers/InMemoryMovementRepository';

const ME = 'user-1';
const OTHER = 'user-2';
const CATEGORY = 'category-1';
const PERIOD = { from: '2026-11-01', to: '2026-11-30' };

describe('GetMovementSummaryUseCase', () => {
  let movements: InMemoryMovementRepository;
  let useCase: GetMovementSummaryUseCase;

  const seed = (overrides: Partial<StoredMovement> = {}) =>
    movements.seed({ userId: ME, categoryId: CATEGORY, date: '2026-11-10', ...overrides });

  beforeEach(() => {
    movements = new InMemoryMovementRepository();
    useCase = new GetMovementSummaryUseCase(movements);
  });

  it('adds income and expenses of the period and returns their difference', async () => {
    seed({ type: 'Income', amount: '7000000.00' });
    seed({ type: 'Expense', amount: '916224.00' });
    seed({ type: 'Expense', amount: '100.50' });

    const summary = await useCase.execute(PERIOD, ME);

    expect(summary).toEqual({
      ...PERIOD,
      currencyCode: 'COP',
      totalIncome: '7000000.00',
      totalExpense: '916324.50',
      balance: '6083675.50',
      movementCount: 3,
    });
  });

  it('covers every movement of the period, not only one page of the list', async () => {
    for (let i = 0; i < 25; i++) seed({ type: 'Expense', amount: '1000.00' });

    const summary = await useCase.execute(PERIOD, ME);

    expect(summary.movementCount).toBe(25);
    expect(summary.totalExpense).toBe('25000.00');
  });

  it('includes the movements on the first and last day and leaves out the ones outside', async () => {
    seed({ type: 'Income', amount: '10.00', date: '2026-11-01' });
    seed({ type: 'Income', amount: '20.00', date: '2026-11-30' });
    seed({ type: 'Income', amount: '500.00', date: '2026-10-31' });
    seed({ type: 'Income', amount: '700.00', date: '2026-12-01' });

    const summary = await useCase.execute(PERIOD, ME);

    expect(summary.totalIncome).toBe('30.00');
    expect(summary.movementCount).toBe(2);
  });

  it('ignores the soft-deleted movements', async () => {
    seed({ type: 'Expense', amount: '1000.00' });
    seed({ type: 'Expense', amount: '9999.00', deletedAt: new Date(), deletedBy: ME });

    const summary = await useCase.execute(PERIOD, ME);

    expect(summary.totalExpense).toBe('1000.00');
    expect(summary.movementCount).toBe(1);
  });

  it("never mixes in another user's movements", async () => {
    seed({ type: 'Income', amount: '100.00' });
    seed({ userId: OTHER, type: 'Income', amount: '5000000.00' });
    seed({ userId: OTHER, type: 'Expense', amount: '3000000.00' });

    const mine = await useCase.execute(PERIOD, ME);
    const theirs = await useCase.execute(PERIOD, OTHER);

    expect(mine).toMatchObject({ totalIncome: '100.00', totalExpense: '0.00', movementCount: 1 });
    expect(theirs).toMatchObject({ totalIncome: '5000000.00', totalExpense: '3000000.00', movementCount: 2 });
  });

  it('uses COP by default and only adds movements of the requested currency', async () => {
    seed({ type: 'Expense', amount: '1000.00', currencyCode: 'COP' });
    seed({ type: 'Expense', amount: '50.00', currencyCode: 'USD' });

    const cop = await useCase.execute(PERIOD, ME);
    const usd = await useCase.execute({ ...PERIOD, currencyCode: 'USD' }, ME);

    expect(cop).toMatchObject({ currencyCode: 'COP', totalExpense: '1000.00', movementCount: 1 });
    expect(usd).toMatchObject({ currencyCode: 'USD', totalExpense: '50.00', movementCount: 1 });
  });

  it('returns zeros and a count of 0 when the period has no movements', async () => {
    const summary = await useCase.execute(PERIOD, ME);

    expect(summary).toEqual({
      ...PERIOD,
      currencyCode: 'COP',
      totalIncome: '0.00',
      totalExpense: '0.00',
      balance: '0.00',
      movementCount: 0,
    });
  });

  it('returns a negative balance when the expenses are higher than the income', async () => {
    seed({ type: 'Income', amount: '80000.00' });
    seed({ type: 'Expense', amount: '200000.00' });

    expect((await useCase.execute(PERIOD, ME)).balance).toBe('-120000.00');
  });

  it('adds cents without floating point errors (0.10 + 0.20 = 0.30)', async () => {
    seed({ type: 'Income', amount: '0.10' });
    seed({ type: 'Income', amount: '0.20' });

    expect((await useCase.execute(PERIOD, ME)).totalIncome).toBe('0.30');
  });

  it('accepts a one-day period', async () => {
    seed({ type: 'Expense', amount: '10.00', date: '2026-11-10' });

    const summary = await useCase.execute({ from: '2026-11-10', to: '2026-11-10' }, ME);

    expect(summary.movementCount).toBe(1);
  });

  describe('period validation', () => {
    it('rejects a "from" later than "to"', async () => {
      await expect(useCase.execute({ from: '2026-11-30', to: '2026-11-01' }, ME)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: INVALID_PERIOD_MESSAGE,
      });
    });

    it('accepts a period of exactly 366 days and rejects one of 367', async () => {
      // 2028 is a leap year: 2028-01-01 to 2028-12-31 is 366 days.
      await expect(useCase.execute({ from: '2028-01-01', to: '2028-12-31' }, ME)).resolves.toBeDefined();

      const error = await useCase.execute({ from: '2028-01-01', to: '2029-01-01' }, ME).catch((e) => e);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe(PERIOD_TOO_LONG_MESSAGE);
    });
  });

  describe('periodDays', () => {
    it('counts both ends of the range', () => {
      expect(periodDays('2026-11-10', '2026-11-10')).toBe(1);
      expect(periodDays('2026-11-01', '2026-11-30')).toBe(30);
      expect(periodDays('2026-01-01', '2026-12-31')).toBe(365);
      expect(periodDays('2028-01-01', '2028-12-31')).toBe(MAX_PERIOD_DAYS);
    });
  });
});
