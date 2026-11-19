import { ACCOUNT_TYPES, type AccountType, type BankAccount } from '../../domain/types';

export interface AccountFormValues {
  bankName: string;
  accountAlias: string;
  accountType: AccountType;
  currencyCode: string;
}

export type AccountFormErrors = Partial<Record<keyof AccountFormValues, string>>;

// Body of POST / PATCH /api/bank-accounts. On edit the currency is only sent when it changed: the API refuses a
// change when the account has movements, and sending the same one is a no-op that is better not to send at all.
export interface AccountPayload {
  bankName: string;
  accountAlias: string | null;
  accountType: AccountType;
  currencyCode?: string;
}

export const MAX_BANK_NAME = 100;
export const MAX_ALIAS = 100;
export const DEFAULT_ACCOUNT_CURRENCY = 'COP';

export function emptyAccountForm(): AccountFormValues {
  return { bankName: '', accountAlias: '', accountType: 'Savings', currencyCode: DEFAULT_ACCOUNT_CURRENCY };
}

export function formFromAccount(account: BankAccount): AccountFormValues {
  return {
    bankName: account.bankName,
    accountAlias: account.accountAlias ?? '',
    accountType: account.accountType,
    currencyCode: account.currencyCode,
  };
}

export type AccountFormResult = { ok: true; payload: AccountPayload } | { ok: false; errors: AccountFormErrors };

export function validateAccountForm(values: AccountFormValues, original: BankAccount | null): AccountFormResult {
  const errors: AccountFormErrors = {};
  const bankName = values.bankName.trim();
  const alias = values.accountAlias.trim();

  if (bankName === '') errors.bankName = 'El nombre del banco es obligatorio';
  else if (bankName.length > MAX_BANK_NAME) errors.bankName = `El nombre del banco no puede superar los ${MAX_BANK_NAME} caracteres`;
  if (alias.length > MAX_ALIAS) errors.accountAlias = `El alias no puede superar los ${MAX_ALIAS} caracteres`;
  if (!ACCOUNT_TYPES.includes(values.accountType)) errors.accountType = 'Selecciona un tipo de cuenta';
  if (!/^[A-Z]{3}$/.test(values.currencyCode)) errors.currencyCode = 'Selecciona una moneda';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const currencyChanged = original === null || values.currencyCode !== original.currencyCode;
  return {
    ok: true,
    payload: {
      bankName,
      accountAlias: alias === '' ? null : alias,
      accountType: values.accountType,
      ...(currencyChanged ? { currencyCode: values.currencyCode } : {}),
    },
  };
}

export const ACCOUNT_FORM_FIELDS: readonly (keyof AccountFormValues)[] = ['bankName', 'accountAlias', 'accountType', 'currencyCode'];
