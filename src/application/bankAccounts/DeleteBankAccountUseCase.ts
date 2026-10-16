import type { BankAccountRepository } from '../../domain/repositories/BankAccountRepository';
import { findOwnedBankAccount } from './bankAccountAccess';

// The account's movements are left untouched.
export class DeleteBankAccountUseCase {
  constructor(private readonly accounts: BankAccountRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    await findOwnedBankAccount(this.accounts, id, userId);
    await this.accounts.softDelete(id, { deletedBy: userId });
  }
}
