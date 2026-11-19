import { describe, expect, it, vi } from 'vitest';
import { createHttpClient } from '../http/client';
import { createCatalogService } from './catalogService';

function pageResponse(items: unknown[], total: number, page: number) {
  return new Response(JSON.stringify(items), {
    status: 200,
    headers: { 'X-Total-Count': String(total), 'X-Page': String(page), 'X-Limit': '100' },
  });
}

describe('catalogService', () => {
  it('fetches every page of the categories (limit 100)', async () => {
    const first = Array.from({ length: 100 }, (_, i) => ({ id: `c${i}` }));
    const second = [{ id: 'c100' }];
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(pageResponse(first, 101, 1))
      .mockResolvedValueOnce(pageResponse(second, 101, 2));
    const client = createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'tok', onUnauthorized: vi.fn(), fetchImpl });

    const categories = await createCatalogService(client).listCategories();

    expect(categories).toHaveLength(101);
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      'http://api.test/api/categories?page=1&limit=100',
      'http://api.test/api/categories?page=2&limit=100',
    ]);
  });

  it('reads the bank accounts from /api/bank-accounts', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(pageResponse([{ id: 'a1' }], 1, 1));
    const client = createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'tok', onUnauthorized: vi.fn(), fetchImpl });

    expect(await createCatalogService(client).listBankAccounts()).toEqual([{ id: 'a1' }]);
    expect(fetchImpl.mock.calls[0]![0]).toBe('http://api.test/api/bank-accounts?page=1&limit=100');
  });
});
