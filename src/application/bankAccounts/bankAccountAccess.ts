import type { BankAccount, BankAccountWithBalance } from '../../domain/entities/BankAccount';
import { NotFoundError, ValidationError } from '../../domain/errors';
import type { BankAccountRepository } from '../../domain/repositories/BankAccountRepository';
import type { CurrencyRepository } from '../../domain/repositories/CurrencyRepository';
import { withBalances } from './balance';

export const BANK_ACCOUNT_NOT_FOUND_MESSAGE = 'Cuenta bancaria no encontrada';

// Only the owner can see or change an account.
// Another user's account answers 404 so its existence is not revealed.
export async function findOwnedBankAccount(
  accounts: BankAccountRepository,
  id: string,
  userId: string,
): Promise<BankAccount> {
  const account = await accounts.findById(id);
  if (!account || account.userId !== userId) {
    throw new NotFoundError(BANK_ACCOUNT_NOT_FOUND_MESSAGE);
  }
  return account;
}

export async function withBalance(
  accounts: BankAccountRepository,
  account: BankAccount,
): Promise<BankAccountWithBalance> {
  const [result] = withBalances([account], await accounts.sumMovementsByAccount([account.id]));
  return result!;
}

export async function ensureActiveCurrency(currencies: CurrencyRepository, code: string): Promise<void> {
  if (await currencies.isActive(code)) return;
  const message = `La moneda ${code} no existe o no está activa`;
  throw new ValidationError(message, [{ path: 'body.currencyCode', message }]);
}
