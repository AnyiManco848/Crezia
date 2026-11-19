import type { BankAccount, Category } from '../../domain/types';
import type { HttpClient } from '../http/client';
import { http } from '../http';
import { fetchAllPages, pageFromHeaders } from '../http/pagination';

// The API caps a page at 100 items.
const PAGE_SIZE = 100;

// Read-only catalogs for the selects (categories and accounts of the user). Both endpoints answer an array with
// pagination in the X-Total-Count / X-Page / X-Limit headers; every page is fetched so no option is missing.
export function createCatalogService(client: HttpClient) {
  return {
    listCategories(signal?: AbortSignal): Promise<Category[]> {
      return fetchAllPages(async (page) =>
        pageFromHeaders(await client.get<Category[]>('/api/categories', { query: { page, limit: PAGE_SIZE }, signal })),
      );
    },

    listBankAccounts(signal?: AbortSignal): Promise<BankAccount[]> {
      return fetchAllPages(async (page) =>
        pageFromHeaders(await client.get<BankAccount[]>('/api/bank-accounts', { query: { page, limit: PAGE_SIZE }, signal })),
      );
    },
  };
}

export const catalogService = createCatalogService(http);
