import type { AccountPayload } from '../../application/validation/accountForm';
import type { BankAccount } from '../../domain/types';
import type { HttpClient } from '../http/client';
import { http } from '../http';
import { pageFromHeaders, type Page } from '../http/pagination';

export interface ListAccountsParams {
  page: number;
  limit: number;
}

export function createAccountService(client: HttpClient) {
  return {
    // GET /api/bank-accounts -> an array; the pagination travels in X-Total-Count, X-Page and X-Limit.
    async list({ page, limit }: ListAccountsParams, signal?: AbortSignal): Promise<Page<BankAccount>> {
      return pageFromHeaders(await client.get<BankAccount[]>('/api/bank-accounts', { query: { page, limit }, signal }));
    },

    async create(payload: AccountPayload): Promise<BankAccount> {
      return (await client.post<BankAccount>('/api/bank-accounts', payload)).data;
    },

    async update(id: string, payload: AccountPayload): Promise<BankAccount> {
      return (await client.patch<BankAccount>(`/api/bank-accounts/${encodeURIComponent(id)}`, payload)).data;
    },

    // Soft delete: the account's movements are kept.
    async remove(id: string): Promise<void> {
      await client.delete(`/api/bank-accounts/${encodeURIComponent(id)}`);
    },
  };
}

export const accountService = createAccountService(http);
