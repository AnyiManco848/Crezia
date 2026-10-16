import type { AccountType, BankAccountWithBalance } from '../../domain/entities/BankAccount';
import type { BankAccountRepository } from '../../domain/repositories/BankAccountRepository';
import type { CurrencyRepository } from '../../domain/repositories/CurrencyRepository';
import { ensureActiveCurrency } from './bankAccountAccess';

export interface CreateBankAccountInput {
  bankName: string;
  accountAlias?: string | null;
  accountType: AccountType;
  currencyCode: string;
}

export class CreateBankAccountUseCase {
  constructor(
    private readonly accounts: BankAccountRepository,
    private readonly currencies: CurrencyRepository,
  ) {}

  // Only the explicit fields are copied: the owner is always the authenticated user.
  async execute(
    { bankName, accountAlias, accountType, currencyCode }: CreateBankAccountInput,
    userId: string,
  ): Promise<BankAccountWithBalance> {
    await ensureActiveCurrency(this.currencies, currencyCode);
    const account = await this.accounts.create({
      userId,
      bankName,
      accountAlias: accountAlias ?? null,
      accountType,
      currencyCode,
      createdBy: userId,
      updatedBy: userId,
    });
    // A new account has no movements yet.
    return { ...account, balance: '0.00' };
  }
}
