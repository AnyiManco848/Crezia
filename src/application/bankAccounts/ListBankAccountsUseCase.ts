import type { BankAccountWithBalance } from '../../domain/entities/BankAccount';
import type { BankAccountRepository } from '../../domain/repositories/BankAccountRepository';
import { withBalances } from './balance';

export class ListBankAccountsUseCase {
  constructor(private readonly accounts: BankAccountRepository) {}

  // Two queries in total, whatever the number of accounts: the accounts and their grouped totals.
  async execute(userId: string): Promise<BankAccountWithBalance[]> {
    const accounts = await this.accounts.listByUser(userId);
    if (accounts.length === 0) return [];
    const totals = await this.accounts.sumMovementsByAccount(accounts.map((a) => a.id));
    return withBalances(accounts, totals);
  }
}
