import { describe, expect, it } from 'vitest';
import type { BankAccount } from '../../domain/types';
import { emptyAccountForm, formFromAccount, validateAccountForm } from './accountForm';

const account: BankAccount = {
  id: 'a1',
  bankName: 'Bancolombia',
  accountAlias: 'Gastos',
  accountType: 'Checking',
  currencyCode: 'COP',
  balance: '10.00',
};

describe('validateAccountForm', () => {
  it('requires the bank name and trims it', () => {
    expect(validateAccountForm(emptyAccountForm(), null)).toEqual({
      ok: false,
      errors: { bankName: 'El nombre del banco es obligatorio' },
    });
    const result = validateAccountForm({ ...emptyAccountForm(), bankName: '  Nequi ' }, null);
    expect(result.ok && result.payload.bankName).toBe('Nequi');
  });

  it('on create sends the currency; an empty alias is null', () => {
    const result = validateAccountForm({ ...emptyAccountForm(), bankName: 'Nequi', accountAlias: '  ' }, null);

    expect(result).toEqual({
      ok: true,
      payload: { bankName: 'Nequi', accountAlias: null, accountType: 'Savings', currencyCode: 'COP' },
    });
  });

  it('on edit only sends the currency when it changed', () => {
    const same = validateAccountForm(formFromAccount(account), account);
    const changed = validateAccountForm({ ...formFromAccount(account), currencyCode: 'USD' }, account);

    expect(same.ok && 'currencyCode' in same.payload).toBe(false);
    expect(changed.ok && changed.payload.currencyCode).toBe('USD');
  });

  it('clears the alias on edit by sending null', () => {
    const result = validateAccountForm({ ...formFromAccount(account), accountAlias: '' }, account);

    expect(result.ok && result.payload.accountAlias).toBeNull();
  });

  it('limits the bank name and the alias to 100 characters', () => {
    const result = validateAccountForm({ ...emptyAccountForm(), bankName: 'x'.repeat(101), accountAlias: 'y'.repeat(101) }, null);

    expect(result).toEqual({
      ok: false,
      errors: {
        bankName: 'El nombre del banco no puede superar los 100 caracteres',
        accountAlias: 'El alias no puede superar los 100 caracteres',
      },
    });
  });
});
