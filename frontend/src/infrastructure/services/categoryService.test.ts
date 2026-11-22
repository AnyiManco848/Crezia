import { describe, expect, it, vi } from 'vitest';
import { createHttpClient } from '../http/client';
import { createCategoryService } from './categoryService';

function serviceWith(response: Response) {
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response);
  const client = createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'tok', onUnauthorized: vi.fn(), fetchImpl });
  return { fetchImpl, service: createCategoryService(client) };
}

describe('categoryService', () => {
  it('lists with page and limit and reads the total from the headers', async () => {
    const { fetchImpl, service } = serviceWith(
      new Response(JSON.stringify([{ id: 'c1' }]), { status: 200, headers: { 'X-Total-Count': '33', 'X-Page': '2', 'X-Limit': '10' } }),
    );

    const page = await service.list({ page: 2, limit: 10 });

    expect(fetchImpl.mock.calls[0]![0]).toBe('http://api.test/api/categories?page=2&limit=10');
    expect(page).toEqual({ items: [{ id: 'c1' }], total: 33, page: 2, limit: 10 });
  });

  it('creates, updates and deletes with POST, PATCH and DELETE', async () => {
    const payload = { name: 'Mercado', description: null };
    const create = serviceWith(new Response('{"id":"n"}', { status: 201 }));
    await create.service.create(payload);
    expect(create.fetchImpl.mock.calls[0]![0]).toBe('http://api.test/api/categories');
    expect(create.fetchImpl.mock.calls[0]![1]?.method).toBe('POST');
    expect(JSON.parse(create.fetchImpl.mock.calls[0]![1]?.body as string)).toEqual(payload);

    const update = serviceWith(new Response('{"id":"c1"}', { status: 200 }));
    await update.service.update('c1', payload);
    expect(update.fetchImpl.mock.calls[0]![0]).toBe('http://api.test/api/categories/c1');
    expect(update.fetchImpl.mock.calls[0]![1]?.method).toBe('PATCH');

    const remove = serviceWith(new Response('{"message":"ok"}', { status: 200 }));
    await remove.service.remove('c1');
    expect(remove.fetchImpl.mock.calls[0]![1]?.method).toBe('DELETE');
  });
});
