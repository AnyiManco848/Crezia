import { describe, expect, it } from 'vitest';
import {
  createBankAccountBodySchema,
  updateBankAccountBodySchema,
} from '../../../src/presentation/schemas/bankAccountSchemas';

describe('bank account schemas', () => {
  const valid = { bankName: ' Bancolombia ', accountType: 'Savings', currencyCode: 'cop' };

  it('trims, upper-cases the currency and strips unknown keys', () => {
    const result = createBankAccountBodySchema.parse({ ...valid, userId: 'x', balance: 100, lastSyncedAt: 'y' });

    expect(result).toEqual({ bankName: 'Bancolombia', accountType: 'Savings', currencyCode: 'COP' });
  });

  it('rejects an unknown account type', () => {
    expect(createBankAccountBodySchema.safeParse({ ...valid, accountType: 'Bitcoin' }).success).toBe(false);
  });

  it('rejects a currency code that is not 3 letters', () => {
    expect(createBankAccountBodySchema.safeParse({ ...valid, currencyCode: 'PESOS' }).success).toBe(false);
  });

  it('requires bankName, accountType and currencyCode on create', () => {
    expect(createBankAccountBodySchema.safeParse({}).error?.issues.map((i) => i.path[0])).toEqual([
      'bankName',
      'accountType',
      'currencyCode',
    ]);
  });

  it('accepts a partial update and rejects an empty one', () => {
    expect(updateBankAccountBodySchema.safeParse({ accountAlias: null }).success).toBe(true);
    expect(updateBankAccountBodySchema.safeParse({}).success).toBe(false);
    expect(updateBankAccountBodySchema.safeParse({ userId: 'x' }).success).toBe(false);
  });
});
