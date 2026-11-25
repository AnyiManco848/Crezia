import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MovementUseCases } from '../../../src/application/movements';
import type { TokenService } from '../../../src/application/services';
import { UnauthorizedError } from '../../../src/domain/errors';
import { MovementController } from '../../../src/presentation/controllers/MovementController';
import { errorHandler, notFound } from '../../../src/presentation/middlewares/errorHandler';
import { authenticate } from '../../../src/presentation/middlewares/auth';
import { movementRoutes } from '../../../src/presentation/routes/movementRoutes';

const USER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const SUMMARY = { totalIncome: '0.00' };

// The real router and middlewares over an HTTP server; only the use cases and the token service are fakes.
describe('movementRoutes - GET /summary', () => {
  const useCases = {
    summary: { execute: vi.fn() },
    get: { execute: vi.fn() },
  } as unknown as MovementUseCases;
  const tokens: TokenService = {
    sign: vi.fn(),
    verify: (token: string) => {
      if (token !== 'valid') throw new UnauthorizedError('Token inválido');
      return { userId: USER_ID };
    },
  };
  let server: Server;
  let baseUrl: string;

  const call = (path: string, token: string | null = 'valid') =>
    fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

  beforeAll(async () => {
    const app = express();
    app.use('/api/movements', movementRoutes(new MovementController(useCases), authenticate(tokens, { isActive: async () => true })));
    app.use(notFound);
    app.use(errorHandler);
    server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    vi.mocked(useCases.summary.execute).mockReset().mockResolvedValue(SUMMARY as never);
    vi.mocked(useCases.get.execute).mockReset();
  });

  it('is handled by the summary use case and not taken as a movement id', async () => {
    const response = await call('/api/movements/summary?from=2026-11-01&to=2026-11-30');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(SUMMARY);
    expect(useCases.summary.execute).toHaveBeenCalledTimes(1);
    expect(useCases.get.execute).not.toHaveBeenCalled();
  });

  it('passes the parsed query and the id of the token owner to the use case', async () => {
    await call('/api/movements/summary?from=2026-11-01&to=2026-11-30&currencyCode=usd');

    expect(useCases.summary.execute).toHaveBeenCalledWith(
      { from: '2026-11-01', to: '2026-11-30', currencyCode: 'USD' },
      USER_ID,
    );
  });

  it('ignores a userId sent in the query', async () => {
    await call('/api/movements/summary?from=2026-11-01&to=2026-11-30&userId=00000000-0000-4000-8000-000000000000');

    expect(useCases.summary.execute).toHaveBeenCalledWith(
      { from: '2026-11-01', to: '2026-11-30', currencyCode: 'COP' },
      USER_ID,
    );
  });

  it.each([
    ['without dates', '/api/movements/summary'],
    ['with a malformed date', '/api/movements/summary?from=hoy&to=2026-11-30'],
    ['with "from" later than "to"', '/api/movements/summary?from=2026-11-30&to=2026-11-01'],
    ['with a period longer than 366 days', '/api/movements/summary?from=2028-01-01&to=2029-01-01'],
    ['with an invalid currency', '/api/movements/summary?from=2026-11-01&to=2026-11-30&currencyCode=XX'],
  ])('answers 400 VALIDATION_ERROR %s', async (_name, path) => {
    const response = await call(path);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
    expect(useCases.summary.execute).not.toHaveBeenCalled();
  });

  it('answers 401 without a token or with an invalid one', async () => {
    expect((await call('/api/movements/summary?from=2026-11-01&to=2026-11-30', null)).status).toBe(401);
    expect((await call('/api/movements/summary?from=2026-11-01&to=2026-11-30', 'bad')).status).toBe(401);
    expect(useCases.summary.execute).not.toHaveBeenCalled();
  });
});
