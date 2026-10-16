import type { BankAccountWithBalance } from '../../domain/entities/BankAccount';
import type { BankAccountRepository } from '../../domain/repositories/BankAccountRepository';
import { findOwnedBankAccount, withBalance } from './bankAccountAccess';

export class GetBankAccountUseCase {
  constructor(private readonly accounts: BankAccountRepository) {}

  async execute(id: string, userId: string): Promise<BankAccountWithBalance> {
    const account = await findOwnedBankAccount(this.accounts, id, userId);
    return withBalance(this.accounts, account);
  }
}
