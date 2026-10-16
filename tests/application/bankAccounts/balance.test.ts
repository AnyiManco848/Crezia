import { describe, expect, it } from 'vitest';
import { computeBalance, withBalances } from '../../../src/application/bankAccounts/balance';
import type { BankAccount } from '../../../src/domain/entities/BankAccount';

describe('computeBalance', () => {
  it('returns 0 when there are no movements', () => {
    expect(computeBalance([])).toBe('0.00');
  });

  it('subtracts expenses from incomes', () => {
    const result = computeBalance([
      { type: 'Income', amount: '3500000' },
      { type: 'Expense', amount: '1200000.00' },
      { type: 'Expense', amount: '85000.5' },
      { type: 'Income', amount: '0.25' },
    ]);

    expect(result).toBe('2214999.75');
  });

  it('ignores deleted movements', () => {
    const result = computeBalance([
      { type: 'Income', amount: '1000' },
      { type: 'Expense', amount: '300' },
      { type: 'Expense', amount: '500', deletedAt: new Date() },
      { type: 'Income', amount: '9999', deletedAt: new Date() },
    ]);

    expect(result).toBe('700.00');
  });

  it('can be negative when expenses exceed incomes', () => {
    expect(computeBalance([{ type: 'Expense', amount: '10.05' }])).toBe('-10.05');
  });

  it('adds cents without floating point errors', () => {
    expect(computeBalance([{ type: 'Income', amount: '0.10' }, { type: 'Income', amount: '0.20' }])).toBe('0.30');
  });
});

describe('withBalances', () => {
  const account = (id: string): BankAccount => ({
    id,
    userId: 'user-1',
    bankName: 'Banco',
    accountAlias: null,
    accountType: 'Savings',
    currencyCode: 'COP',
    lastSyncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('assigns each account its own grouped totals and 0 when it has none', () => {
    const result = withBalances(
      [account('a'), account('b'), account('c')],
      [
        { bankAccountId: 'a', type: 'Income', amount: '500.00' },
        { bankAccountId: 'a', type: 'Expense', amount: '200.00' },
        { bankAccountId: 'b', type: 'Expense', amount: '50.00' },
      ],
    );

    expect(result.map((a) => [a.id, a.balance])).toEqual([
      ['a', '300.00'],
      ['b', '-50.00'],
      ['c', '0.00'],
    ]);
  });
});
