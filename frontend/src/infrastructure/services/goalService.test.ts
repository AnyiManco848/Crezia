import { describe, expect, it, vi } from 'vitest';
import { createHttpClient } from '../http/client';
import { createGoalService } from './goalService';

function serviceWith(response: Response) {
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response);
  const client = createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'tok', onUnauthorized: vi.fn(), fetchImpl });
  return { fetchImpl, service: createGoalService(client) };
}

describe('goalService', () => {
  it('lists with page and limit and reads the total from the headers', async () => {
    const { fetchImpl, service } = serviceWith(
      new Response(JSON.stringify([{ id: 'g1', percentage: 40 }]), { status: 200, headers: { 'X-Total-Count': '12', 'X-Page': '2', 'X-Limit': '10' } }),
    );

    const page = await service.list({ page: 2, limit: 10 });

    expect(fetchImpl.mock.calls[0]![0]).toBe('http://api.test/api/goals?page=2&limit=10');
    expect(page).toEqual({ items: [{ id: 'g1', percentage: 40 }], total: 12, page: 2, limit: 10 });
  });

  it('creates, updates and deletes with POST, PATCH and DELETE', async () => {
    const payload = {
      categoryId: 'c1',
      name: 'Viaje',
      reason: 'Travel',
      reasonOther: null,
      targetAmount: '15000000',
      currencyCode: 'COP',
      startDate: '2026-11-22',
      endDate: '2027-12-31',
    } as const;
    const create = serviceWith(new Response('{"id":"n"}', { status: 201 }));
    await create.service.create(payload);
    expect(create.fetchImpl.mock.calls[0]![0]).toBe('http://api.test/api/goals');
    expect(create.fetchImpl.mock.calls[0]![1]?.method).toBe('POST');
    expect(JSON.parse(create.fetchImpl.mock.calls[0]![1]?.body as string)).toEqual(payload);

    const update = serviceWith(new Response('{"id":"g1"}', { status: 200 }));
    await update.service.update('g1', { ...payload, status: 'Completed' });
    expect(update.fetchImpl.mock.calls[0]![0]).toBe('http://api.test/api/goals/g1');
    expect(update.fetchImpl.mock.calls[0]![1]?.method).toBe('PATCH');

    const remove = serviceWith(new Response('{"message":"ok"}', { status: 200 }));
    await remove.service.remove('g1');
    expect(remove.fetchImpl.mock.calls[0]![1]?.method).toBe('DELETE');
  });
});
