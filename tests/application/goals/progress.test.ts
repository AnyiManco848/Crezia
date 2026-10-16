import { describe, expect, it } from 'vitest';
import {
  computeGoalProgress,
  progressFromMovements,
  withProgress,
  type ContributionEntry,
} from '../../../src/application/goals/progress';
import type { Goal } from '../../../src/domain/entities/Goal';

const ME = 'user-1';
const SAVINGS = 'cat-savings';

const goal: Goal = {
  id: 'goal-1',
  userId: ME,
  categoryId: SAVINGS,
  name: 'Viaje a Cartagena',
  reason: 'Travel',
  reasonOther: null,
  targetAmount: '2000000.00',
  currencyCode: 'COP',
  startDate: '2026-10-01',
  endDate: '2027-04-01',
  status: 'Active',
  createdAt: new Date('2026-10-01'),
  updatedAt: new Date('2026-10-01'),
};

function entry(overrides: Partial<ContributionEntry> = {}): ContributionEntry {
  return { userId: ME, categoryId: SAVINGS, type: 'Expense', amount: '400000', date: '2026-10-05', ...overrides };
}

describe('goal progress', () => {
  it('is 0% without movements', () => {
    expect(progressFromMovements(goal, [])).toEqual({
      accumulated: '0.00',
      remaining: '2000000.00',
      percentage: 0,
    });
  });

  it('adds the contributions and computes the percentage', () => {
    const result = progressFromMovements(goal, [entry(), entry({ amount: '100000.50', date: '2026-11-01' })]);

    expect(result).toEqual({ accumulated: '500000.50', remaining: '1499999.50', percentage: 25 });
  });

  it('rounds the percentage to two decimals', () => {
    expect(computeGoalProgress('3.00', '1.00').percentage).toBe(33.33);
    expect(computeGoalProgress('3.00', '2.00').percentage).toBe(66.67);
  });

  it('adds in cents without floating point errors', () => {
    expect(progressFromMovements(goal, [entry({ amount: '0.10' }), entry({ amount: '0.20' })]).accumulated).toBe(
      '0.30',
    );
  });

  it('caps the percentage at 100 and the remaining at 0 when the target is exceeded', () => {
    const result = progressFromMovements(goal, [entry({ amount: '1500000' }), entry({ amount: '900000' })]);

    expect(result).toEqual({ accumulated: '2400000.00', remaining: '0.00', percentage: 100 });
  });

  it('counts the movements on start_date and end_date (inclusive range)', () => {
    const result = progressFromMovements(goal, [entry({ date: '2026-10-01' }), entry({ date: '2027-04-01' })]);

    expect(result.accumulated).toBe('800000.00');
  });

  it.each([
    ['deleted', entry({ deletedAt: new Date() })],
    ['in another category', entry({ categoryId: 'cat-food' })],
    ['before start_date', entry({ date: '2026-09-30' })],
    ['after end_date', entry({ date: '2027-04-02' })],
    ['Income', entry({ type: 'Income' })],
    ['of another user', entry({ userId: 'user-2' })],
  ])('ignores a movement %s', (_label, ignored) => {
    expect(progressFromMovements(goal, [entry(), ignored]).accumulated).toBe('400000.00');
  });

  it('joins grouped totals with their goals, defaulting to 0', () => {
    const other: Goal = { ...goal, id: 'goal-2', targetAmount: '100.00' };

    const result = withProgress([goal, other], [{ goalId: goal.id, amount: '400000.00' }]);

    expect(result.map((g) => [g.id, g.accumulated, g.percentage])).toEqual([
      [goal.id, '400000.00', 20],
      [other.id, '0.00', 0],
    ]);
  });
});
