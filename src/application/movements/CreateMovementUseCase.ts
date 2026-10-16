import type { Movement, MovementType, PaymentMethod } from '../../domain/entities/Movement';
import type { BankAccountRepository } from '../../domain/repositories/BankAccountRepository';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import type { CurrencyRepository } from '../../domain/repositories/CurrencyRepository';
import type { MovementRepository } from '../../domain/repositories/MovementRepository';
import { ensurePositiveAmount, ensureUsableBankAccount, ensureUsableCategory, resolveCurrency } from './movementAccess';

export interface CreateMovementInput {
  bankAccountId?: string | null;
  categoryId: string;
  type: MovementType;
  amount: string;
  // Optional when there is an account: it defaults to the account currency.
  currencyCode?: string;
  date: string;
  paymentMethod: PaymentMethod;
  description?: string | null;
}

export class CreateMovementUseCase {
  constructor(
    private readonly movements: MovementRepository,
    private readonly categories: CategoryRepository,
    private readonly accounts: BankAccountRepository,
    private readonly currencies: CurrencyRepository,
  ) {}

  // Only the explicit fields are copied: the owner is always the authenticated user
  // and the source is always Manual (EmailParsed is reserved for the email parser).
  async execute(
    { bankAccountId, categoryId, type, amount, currencyCode, date, paymentMethod, description }: CreateMovementInput,
    userId: string,
  ): Promise<Movement> {
    ensurePositiveAmount(amount);
    await ensureUsableCategory(this.categories, categoryId, userId);
    const account = bankAccountId ? await ensureUsableBankAccount(this.accounts, bankAccountId, userId) : null;
    const currency = await resolveCurrency(this.currencies, account, currencyCode);

    return this.movements.create({
      userId,
      bankAccountId: account?.id ?? null,
      categoryId,
      type,
      amount,
      currencyCode: currency,
      date,
      paymentMethod,
      source: 'Manual',
      description: description ?? null,
      createdBy: userId,
      updatedBy: userId,
    });
  }
}
