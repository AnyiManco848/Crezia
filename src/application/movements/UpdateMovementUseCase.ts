import type { Movement, MovementType, PaymentMethod } from '../../domain/entities/Movement';
import type { BankAccountRepository } from '../../domain/repositories/BankAccountRepository';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import type { CurrencyRepository } from '../../domain/repositories/CurrencyRepository';
import type { MovementRepository } from '../../domain/repositories/MovementRepository';
import { ensureActiveCurrency } from '../bankAccounts/bankAccountAccess';
import {
  ensurePositiveAmount,
  ensureUsableBankAccount,
  ensureUsableCategory,
  findOwnedMovement,
  resolveCurrency,
} from './movementAccess';

export interface UpdateMovementInput {
  // null detaches the movement from its account.
  bankAccountId?: string | null;
  categoryId?: string;
  type?: MovementType;
  amount?: string;
  currencyCode?: string;
  date?: string;
  paymentMethod?: PaymentMethod;
  description?: string | null;
}

export class UpdateMovementUseCase {
  constructor(
    private readonly movements: MovementRepository,
    private readonly categories: CategoryRepository,
    private readonly accounts: BankAccountRepository,
    private readonly currencies: CurrencyRepository,
  ) {}

  async execute(id: string, input: UpdateMovementInput, userId: string): Promise<Movement> {
    const current = await findOwnedMovement(this.movements, id, userId);
    const { bankAccountId, categoryId, type, amount, currencyCode, date, paymentMethod, description } = input;

    if (amount !== undefined) ensurePositiveAmount(amount);

    // Only real changes are validated, so a client can resend unchanged fields of a movement
    // whose category or account was deleted later on.
    if (categoryId !== undefined && categoryId !== current.categoryId) {
      await ensureUsableCategory(this.categories, categoryId, userId);
    }

    const accountChanged = bankAccountId !== undefined && bankAccountId !== current.bankAccountId;
    const currencyChanged = currencyCode !== undefined && currencyCode !== current.currencyCode;
    const balanceChanged =
      (amount !== undefined && Number(amount) !== Number(current.amount)) ||
      (type !== undefined && type !== current.type);

    let nextCurrency: string | undefined;
    if (accountChanged || currencyChanged || balanceChanged) {
      const accountId = bankAccountId !== undefined ? bankAccountId : current.bankAccountId;
      // A deleted account cannot get new money in or out, the same as on create.
      const account = accountId ? await ensureUsableBankAccount(this.accounts, accountId, userId) : null;
      if (account) {
        nextCurrency = await resolveCurrency(this.currencies, account, currencyCode);
      } else if (currencyChanged) {
        await ensureActiveCurrency(this.currencies, currencyCode);
        nextCurrency = currencyCode;
      }
    }

    return this.movements.update(id, {
      bankAccountId,
      categoryId,
      type,
      amount,
      currencyCode: nextCurrency,
      date,
      paymentMethod,
      description,
      updatedBy: userId,
    });
  }
}
