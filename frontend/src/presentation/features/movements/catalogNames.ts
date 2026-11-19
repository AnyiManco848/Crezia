import type { BankAccount } from '../../../domain/types';

export const NO_ACCOUNT_LABEL = 'Sin cuenta';
// A movement can point to a category or account deleted later: the API stops listing them.
export const MISSING_CATEGORY_LABEL = 'Categoría no disponible';
export const MISSING_ACCOUNT_LABEL = 'Cuenta no disponible';

export function accountLabel(account: Pick<BankAccount, 'bankName' | 'accountAlias'>): string {
  return account.accountAlias ? `${account.bankName} · ${account.accountAlias}` : account.bankName;
}
