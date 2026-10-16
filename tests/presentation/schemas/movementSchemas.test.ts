import { describe, expect, it } from 'vitest';
import {
  createMovementBodySchema,
  listMovementsQuerySchema,
  updateMovementBodySchema,
} from '../../../src/presentation/schemas/movementSchemas';

const CATEGORY = '3f2b8a52-6f0e-4b8f-9b8e-0a1b2c3d4e5f';
const ACCOUNT = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('movement schemas', () => {
  const valid = {
    bankAccountId: ACCOUNT,
    categoryId: CATEGORY,
    type: 'Expense',
    amount: 85000,
    date: '2026-10-15',
    paymentMethod: 'DebitCard',
  };

  it('turns the amount into a string, upper-cases the currency and strips unknown keys', () => {
    const result = createMovementBodySchema.parse({ ...valid, currencyCode: 'cop', userId: 'x', source: 'EmailParsed' });

    expect(result).toEqual({ ...valid, amount: '85000', currencyCode: 'COP' });
  });

  it.each([0, -1, '0.00', '-5000'])('rejects amount %s with the positive amount message', (amount) => {
    const issues = createMovementBodySchema.safeParse({ ...valid, amount }).error?.issues;

    expect(issues?.map((i) => i.message)).toEqual(['El monto debe ser mayor que 0']);
  });

  it.each(['abc', '10.123', 0.1 + 0.2, '1234567890123'])('rejects malformed amount %s', (amount) => {
    expect(createMovementBodySchema.safeParse({ ...valid, amount }).success).toBe(false);
  });

  it('rejects an invalid date, type or payment method', () => {
    expect(createMovementBodySchema.safeParse({ ...valid, date: '2026-02-30' }).success).toBe(false);
    expect(createMovementBodySchema.safeParse({ ...valid, type: 'Transfer' }).success).toBe(false);
    expect(createMovementBodySchema.safeParse({ ...valid, paymentMethod: 'Bitcoin' }).success).toBe(false);
  });

  it('requires categoryId, type, amount, date and paymentMethod on create', () => {
    expect(createMovementBodySchema.safeParse({}).error?.issues.map((i) => i.path[0])).toEqual([
      'categoryId',
      'type',
      'amount',
      'date',
      'paymentMethod',
    ]);
  });

  it('accepts a partial update and rejects an empty one', () => {
    expect(updateMovementBodySchema.safeParse({ bankAccountId: null }).success).toBe(true);
    expect(updateMovementBodySchema.safeParse({}).success).toBe(false);
    expect(updateMovementBodySchema.safeParse({ source: 'Manual' }).success).toBe(false);
  });

  it('applies page 1 and limit 20 by default and coerces query strings', () => {
    expect(listMovementsQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(listMovementsQuerySchema.parse({ page: '3', limit: '50', type: 'Income' })).toEqual({
      page: 3,
      limit: 50,
      type: 'Income',
    });
  });

  it('rejects limit above 100, page below 1 and a reversed date range', () => {
    expect(listMovementsQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(listMovementsQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(listMovementsQuerySchema.safeParse({ from: '2026-10-10', to: '2026-10-01' }).success).toBe(false);
    expect(listMovementsQuerySchema.safeParse({ categoryId: 'nope' }).success).toBe(false);
  });
});
