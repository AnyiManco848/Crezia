import type { BankAccount } from '../../domain/entities/BankAccount';
import { isPositiveAmount, type Movement } from '../../domain/entities/Movement';
import { NotFoundError, ValidationError } from '../../domain/errors';
import type { BankAccountRepository } from '../../domain/repositories/BankAccountRepository';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import type { CurrencyRepository } from '../../domain/repositories/CurrencyRepository';
import type { MovementRepository } from '../../domain/repositories/MovementRepository';
import { ensureActiveCurrency, findOwnedBankAccount } from '../bankAccounts/bankAccountAccess';
import { findVisibleCategory } from '../categories/categoryAccess';

export const MOVEMENT_NOT_FOUND_MESSAGE = 'Movimiento no encontrado';
export const INVALID_AMOUNT_MESSAGE = 'El monto debe ser mayor que 0';
export const INVALID_CATEGORY_MESSAGE = 'La categoría no existe, fue eliminada o no te pertenece';
export const INVALID_BANK_ACCOUNT_MESSAGE = 'La cuenta bancaria no existe, fue eliminada o no te pertenece';
export const CURRENCY_REQUIRED_MESSAGE = 'La moneda es obligatoria cuando el movimiento no tiene cuenta bancaria';

export function currencyMismatchMessage(accountCurrency: string): string {
  return `La moneda debe ser la misma de la cuenta bancaria (${accountCurrency})`;
}

function invalid(path: string, message: string): ValidationError {
  return new ValidationError(message, [{ path, message }]);
}

// Only the owner can see or change a movement.
// Another user's movement answers 404 so its existence is not revealed.
export async function findOwnedMovement(
  movements: MovementRepository,
  id: string,
  userId: string,
): Promise<Movement> {
  const movement = await movements.findById(id);
  if (!movement || movement.userId !== userId) {
    throw new NotFoundError(MOVEMENT_NOT_FOUND_MESSAGE);
  }
  return movement;
}

// Also enforced by the schema and the CHECK (amount > 0); repeated here so the rule lives in the domain.
export function ensurePositiveAmount(amount: string): void {
  if (!isPositiveAmount(amount)) throw invalid('body.amount', INVALID_AMOUNT_MESSAGE);
}

// The category comes in the body, so an unusable one is a 400 instead of the 404 of findVisibleCategory.
export async function ensureUsableCategory(
  categories: CategoryRepository,
  id: string,
  userId: string,
): Promise<void> {
  try {
    await findVisibleCategory(categories, id, userId);
  } catch (err) {
    if (err instanceof NotFoundError) throw invalid('body.categoryId', INVALID_CATEGORY_MESSAGE);
    throw err;
  }
}

// Same idea for the account: it must be the user's and not deleted (findById ignores deleted ones).
export async function ensureUsableBankAccount(
  accounts: BankAccountRepository,
  id: string,
  userId: string,
): Promise<BankAccount> {
  try {
    return await findOwnedBankAccount(accounts, id, userId);
  } catch (err) {
    if (err instanceof NotFoundError) throw invalid('body.bankAccountId', INVALID_BANK_ACCOUNT_MESSAGE);
    throw err;
  }
}

// With an account, the movement always takes the account currency; a different one is rejected.
// Without an account, the currency is required and must be active.
export async function resolveCurrency(
  currencies: CurrencyRepository,
  account: BankAccount | null,
  requested: string | undefined,
): Promise<string> {
  if (account) {
    if (requested !== undefined && requested !== account.currencyCode) {
      throw invalid('body.currencyCode', currencyMismatchMessage(account.currencyCode));
    }
    return account.currencyCode;
  }
  if (requested === undefined) throw invalid('body.currencyCode', CURRENCY_REQUIRED_MESSAGE);
  await ensureActiveCurrency(currencies, requested);
  return requested;
}
