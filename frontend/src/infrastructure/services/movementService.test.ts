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
