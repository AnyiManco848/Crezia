import { describe, expect, it, vi } from 'vitest';
import { createHttpClient } from '../http/client';
import { createMovementService } from './movementService';

describe('movementService.getSummary', () => {
  it('calls GET /api/movements/summary with the period and currency and returns the body', async () => {
    const summary = {
      from: '2026-11-01',
      to: '2026-11-30',
      currencyCode: 'COP',
      totalIncome: '7000000.00',
      totalExpense: '4500000.00',
      balance: '2500000.00',
      movementCount: 12,
    };
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(summary), { status: 200 }));
    const client = createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'tok', onUnauthorized: vi.fn(), fetchImpl });

    const result = await createMovementService(client).getSummary({ from: '2026-11-01', to: '2026-11-30', currencyCode: 'COP' });

    expect(fetchImpl.mock.calls[0]![0]).toBe(
      'http://api.test/api/movements/summary?from=2026-11-01&to=2026-11-30&currencyCode=COP',
    );
    expect(result).toEqual(summary);
  });
});

function serviceWith(responses: Response[]) {
  const fetchImpl = vi.fn<typeof fetch>();
  for (const response of responses) fetchImpl.mockResolvedValueOnce(response);
  const client = createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'tok', onUnauthorized: vi.fn(), fetchImpl });
  return { fetchImpl, service: createMovementService(client) };
}

const FILTERS = { type: 'Expense', categoryId: '', bankAccountId: '', from: '2026-11-01', to: '' } as const;

describe('movementService.list', () => {
  it('sends only the filters in use, plus page and limit, and reads { data, page, limit, total }', async () => {
    const body = { data: [{ id: 'm1' }], page: 2, limit: 10, total: 11 };
    const { fetchImpl, service } = serviceWith([new Response(JSON.stringify(body), { status: 200 })]);

    const page = await service.list({ filters: FILTERS, page: 2, limit: 10 });

    expect(fetchImpl.mock.calls[0]![0]).toBe('http://api.test/api/movements?type=Expense&from=2026-11-01&page=2&limit=10');
    expect(page).toEqual({ items: [{ id: 'm1' }], page: 2, limit: 10, total: 11 });
  });
});

describe('movementService writes', () => {
  const payload = {
    type: 'Expense',
    amount: '85000',
    date: '2026-11-18',
    categoryId: 'c1',
    bankAccountId: null,
    paymentMethod: 'Cash',
    description: null,
    currencyCode: 'COP',
  } as const;

  it('creates with POST and the JSON payload', async () => {
    const { fetchImpl, service } = serviceWith([new Response(JSON.stringify({ id: 'new' }), { status: 201 })]);

    expect(await service.create(payload)).toEqual({ id: 'new' });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('http://api.test/api/movements');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual(payload);
  });

  it('updates with PATCH on the id', async () => {
    const { fetchImpl, service } = serviceWith([new Response(JSON.stringify({ id: 'm1' }), { status: 200 })]);

    await service.update('m1', payload);

    expect(fetchImpl.mock.calls[0]![0]).toBe('http://api.test/api/movements/m1');
    expect(fetchImpl.mock.calls[0]![1]?.method).toBe('PATCH');
  });

  it('deletes with DELETE on the id', async () => {
    const { fetchImpl, service } = serviceWith([new Response(JSON.stringify({ message: 'ok' }), { status: 200 })]);

    await service.remove('m1');

    expect(fetchImpl.mock.calls[0]![0]).toBe('http://api.test/api/movements/m1');
    expect(fetchImpl.mock.calls[0]![1]?.method).toBe('DELETE');
  });
});
