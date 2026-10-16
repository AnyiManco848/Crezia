import type { AccountType, BankAccountWithBalance } from '../../domain/entities/BankAccount';
import { ConflictError } from '../../domain/errors';
import type { BankAccountRepository } from '../../domain/repositories/BankAccountRepository';
import type { CurrencyRepository } from '../../domain/repositories/CurrencyRepository';
import { ensureActiveCurrency, findOwnedBankAccount, withBalance } from './bankAccountAccess';

export const CURRENCY_LOCKED_MESSAGE = 'No se puede cambiar la moneda de una cuenta que ya tiene movimientos';

export interface UpdateBankAccountInput {
  bankName?: string;
  accountAlias?: string | null;
  accountType?: AccountType;
  currencyCode?: string;
}

export class UpdateBankAccountUseCase {
  constructor(
    private readonly accounts: BankAccountRepository,
    private readonly currencies: CurrencyRepository,
  ) {}

  async execute(
    id: string,
    { bankName, accountAlias, accountType, currencyCode }: UpdateBankAccountInput,
    userId: string,
  ): Promise<BankAccountWithBalance> {
    const current = await findOwnedBankAccount(this.accounts, id, userId);
    // Sending the same currency is a no-op, so it is always allowed.
    if (currencyCode !== undefined && currencyCode !== current.currencyCode) {
      await ensureActiveCurrency(this.currencies, currencyCode);
      // The balance adds up the account's movements, so their currency cannot change underneath them.
      if (await this.accounts.hasMovements(id)) throw new ConflictError(CURRENCY_LOCKED_MESSAGE);
    }
    const account = await this.accounts.update(id, {
      bankName,
      accountAlias,
      accountType,
      currencyCode,
      updatedBy: userId,
    });
    return withBalance(this.accounts, account);
  }
}
