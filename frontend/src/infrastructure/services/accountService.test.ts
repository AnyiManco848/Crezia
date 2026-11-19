import { describe, expect, it, vi } from 'vitest';
import { createHttpClient } from '../http/client';
import { createAccountService } from './accountService';

function serviceWith(response: Response) {
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response);
  const client = createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'tok', onUnauthorized: vi.fn(), fetchImpl });
  return { fetchImpl, service: createAccountService(client) };
}

describe('accountService', () => {
  it('lists with page and limit and reads the total from the headers', async () => {
    const { fetchImpl, service } = serviceWith(
      new Response(JSON.stringify([{ id: 'a1' }]), { status: 200, headers: { 'X-Total-Count': '57', 'X-Page': '2', 'X-Limit': '20' } }),
    );

    const page = await service.list({ page: 2, limit: 20 });

    expect(fetchImpl.mock.calls[0]![0]).toBe('http://api.test/api/bank-accounts?page=2&limit=20');
    expect(page).toEqual({ items: [{ id: 'a1' }], total: 57, page: 2, limit: 20 });
  });

  it('creates, updates and deletes with POST, PATCH and DELETE', async () => {
    const payload = { bankName: 'Nequi', accountAlias: null, accountType: 'Savings', currencyCode: 'COP' } as const;
    const create = serviceWith(new Response('{"id":"n"}', { status: 201 }));
    await create.service.create(payload);
    expect(create.fetchImpl.mock.calls[0]![1]?.method).toBe('POST');
    expect(JSON.parse(create.fetchImpl.mock.calls[0]![1]?.body as string)).toEqual(payload);

    const update = serviceWith(new Response('{"id":"a1"}', { status: 200 }));
    await update.service.update('a1', payload);
    expect(update.fetchImpl.mock.calls[0]![0]).toBe('http://api.test/api/bank-accounts/a1');
    expect(update.fetchImpl.mock.calls[0]![1]?.method).toBe('PATCH');

    const remove = serviceWith(new Response('{"message":"ok"}', { status: 200 }));
    await remove.service.remove('a1');
    expect(remove.fetchImpl.mock.calls[0]![1]?.method).toBe('DELETE');
  });
});
