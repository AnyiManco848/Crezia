import { describe, expect, it } from 'vitest';
import { createGoalBodySchema, updateGoalBodySchema } from '../../../src/presentation/schemas/goalSchemas';

const CATEGORY = '3f2b8a52-6f0e-4b8f-9b8e-0a1b2c3d4e5f';

describe('goal schemas', () => {
  const valid = {
    categoryId: CATEGORY,
    name: ' Viaje ',
    reason: 'Travel',
    targetAmount: 2000000,
    currencyCode: 'cop',
    startDate: '2026-10-01',
    endDate: '2027-04-01',
  };

  it('trims, turns the amount into a string, upper-cases the currency and strips unknown keys', () => {
    const result = createGoalBodySchema.parse({ ...valid, userId: 'x', status: 'Completed', accumulated: '1' });

    expect(result).toEqual({ ...valid, name: 'Viaje', targetAmount: '2000000', currencyCode: 'COP' });
  });

  it.each([0, -1, '0.00'])('rejects targetAmount %s', (targetAmount) => {
    const issues = createGoalBodySchema.safeParse({ ...valid, targetAmount }).error?.issues;

    expect(issues?.map((i) => i.message)).toEqual(['El monto objetivo debe ser mayor que 0']);
  });

  it('rejects an unknown reason and an invalid date', () => {
    expect(createGoalBodySchema.safeParse({ ...valid, reason: 'other' }).success).toBe(false);
    expect(createGoalBodySchema.safeParse({ ...valid, endDate: '2027-02-30' }).success).toBe(false);
  });

  it('turns an empty reasonOther into null', () => {
    expect(createGoalBodySchema.parse({ ...valid, reasonOther: '   ' }).reasonOther).toBeNull();
  });

  it('requires every field except reasonOther on create', () => {
    expect(createGoalBodySchema.safeParse({}).error?.issues.map((i) => i.path[0])).toEqual([
      'categoryId',
      'name',
      'reason',
      'targetAmount',
      'currencyCode',
      'startDate',
      'endDate',
    ]);
  });

  it('accepts a partial update with status and rejects an empty one', () => {
    expect(updateGoalBodySchema.safeParse({ status: 'Completed' }).success).toBe(true);
    expect(updateGoalBodySchema.safeParse({ status: 'Paused' }).success).toBe(false);
    expect(updateGoalBodySchema.safeParse({}).success).toBe(false);
    expect(updateGoalBodySchema.safeParse({ userId: 'x' }).success).toBe(false);
  });
});
