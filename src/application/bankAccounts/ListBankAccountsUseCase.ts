import type { BankAccountWithBalance } from '../../domain/entities/BankAccount';
import type { BankAccountRepository } from '../../domain/repositories/BankAccountRepository';
import { normalizePage, toPagedResult, type PagedResult, type PageParams } from '../pagination';
import { withBalances } from './balance';

export class ListBankAccountsUseCase {
  constructor(private readonly accounts: BankAccountRepository) {}

  // Three queries in total, whatever the number of accounts: a page of accounts, their total
  // and the grouped totals of that page only.
  async execute(userId: string, params: PageParams = {}): Promise<PagedResult<BankAccountWithBalance>> {
    const { page, limit, pagination } = normalizePage(params);
    const { data: accounts, total } = await this.accounts.listByUser(userId, pagination);
    if (accounts.length === 0) return toPagedResult({ data: [], total }, page, limit);
    const totals = await this.accounts.sumMovementsByAccount(accounts.map((a) => a.id));
    return toPagedResult({ data: withBalances(accounts, totals), total }, page, limit);
  }
}
