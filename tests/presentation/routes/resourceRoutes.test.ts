import express, { type RequestHandler, type Router } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TokenService } from '../../../src/application/services';
import { NotFoundError, UnauthorizedError } from '../../../src/domain/errors';
import { BankAccountController } from '../../../src/presentation/controllers/BankAccountController';
import { CategoryController } from '../../../src/presentation/controllers/CategoryController';
import { GOAL_DELETED_MESSAGE, GoalController } from '../../../src/presentation/controllers/GoalController';
import { MovementController } from '../../../src/presentation/controllers/MovementController';
import { authenticate } from '../../../src/presentation/middlewares/auth';
import { errorHandler, notFound } from '../../../src/presentation/middlewares/errorHandler';
import { bankAccountRoutes } from '../../../src/presentation/routes/bankAccountRoutes';
import { categoryRoutes } from '../../../src/presentation/routes/categoryRoutes';
import { goalRoutes } from '../../../src/presentation/routes/goalRoutes';
import { movementRoutes } from '../../../src/presentation/routes/movementRoutes';

const USER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000001';
const RESOURCE_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const CATEGORY_ID = '9b2c4f10-1a3d-4e5f-8a7b-6c5d4e3f2a1b';

type UseCaseName = 'list' | 'get' | 'create' | 'update' | 'delete';

interface ResourceCase {
  name: string;
  path: string;
  notFoundMessage: string;
  deletedMessage: string;
  // Builds the real controller and router over fake use cases.
  mount: (useCases: Record<UseCaseName, { execute: ReturnType<typeof vi.fn> }>, auth: RequestHandler) => Router;
  validCreate: Record<string, unknown>;
  invalidCreate: Record<string, unknown>;
  // A field the client must not be able to set: the schema strips it, so the use case never sees it.
  forbiddenField: string;
  validUpdate: Record<string, unknown>;
  // Movements answer the list as one object; the other resources send an array plus pagination headers.
  paginatedByHeaders: boolean;
  // How the use case receives the owner and the list query.
  expectedListArgs: unknown[];
}

const RESOURCES: ResourceCase[] = [
  {
    name: 'categories',
    path: '/api/categories',
    notFoundMessage: 'Categoría no encontrada',
    deletedMessage: 'Categoría eliminada con éxito',
    mount: (uc, auth) => categoryRoutes(new CategoryController(uc as never), auth),
    validCreate: { name: '  Mascotas  ', description: null },
    invalidCreate: { name: '' },
    forbiddenField: 'isDefault',
    validUpdate: { description: 'Comida y veterinario' },
    paginatedByHeaders: true,
    expectedListArgs: [USER_ID, { page: 1, limit: 50 }],
  },
  {
    name: 'bank accounts',
    path: '/api/bank-accounts',
    notFoundMessage: 'Cuenta bancaria no encontrada',
    deletedMessage: 'Cuenta bancaria eliminada con éxito',
    mount: (uc, auth) => bankAccountRoutes(new BankAccountController(uc as never), auth),
    validCreate: { bankName: 'Bancolombia', accountType: 'Savings', currencyCode: 'cop' },
    invalidCreate: { bankName: 'Bancolombia', accountType: 'Crypto', currencyCode: 'COP' },
    forbiddenField: 'userId',
    validUpdate: { accountAlias: 'Ahorros' },
    paginatedByHeaders: true,
    expectedListArgs: [USER_ID, { page: 1, limit: 50 }],
  },
  {
    name: 'goals',
    path: '/api/goals',
    notFoundMessage: 'Meta no encontrada',
    deletedMessage: GOAL_DELETED_MESSAGE,
    mount: (uc, auth) => goalRoutes(new GoalController(uc as never), auth),
    validCreate: {
      categoryId: CATEGORY_ID,
      name: 'Viaje',
      reason: 'Travel',
      targetAmount: '1500000.50',
      currencyCode: 'COP',
      startDate: '2026-11-01',
      endDate: '2027-05-01',
    },
    invalidCreate: { categoryId: 'no-uuid', name: 'Viaje', reason: 'Travel', targetAmount: '-5' },
    forbiddenField: 'status',
    validUpdate: { name: 'Viaje a Japón' },
    paginatedByHeaders: true,
    expectedListArgs: [USER_ID, { page: 1, limit: 50 }],
  },
  {
    name: 'movements',
    path: '/api/movements',
    notFoundMessage: 'Movimiento no encontrado',
    deletedMessage: 'Movimiento eliminado con éxito',
    mount: (uc, auth) => movementRoutes(new MovementController(uc as never), auth),
    validCreate: {
      categoryId: CATEGORY_ID,
      type: 'Expense',
      amount: 85000,
      date: '2026-11-20',
      paymentMethod: 'Cash',
    },
    invalidCreate: { categoryId: CATEGORY_ID, type: 'Transfer', amount: 0, date: '20-11-2026', paymentMethod: 'Cash' },
    forbiddenField: 'userId',
    validUpdate: { description: 'Almuerzo' },
    paginatedByHeaders: false,
    expectedListArgs: [{ page: 1, limit: 20 }, USER_ID],
  },
];

// The real router, controller and middlewares over an HTTP server; only the use cases and the token service are fakes
// (no database). The use cases decide ownership, so "another user's resource" is simulated with a NotFoundError.
describe.each(RESOURCES)('$name routes', (resource) => {
  const useCases = Object.fromEntries(
    (['list', 'get', 'create', 'update', 'delete'] as const).map((name) => [name, { execute: vi.fn() }]),
  ) as Record<UseCaseName, { execute: ReturnType<typeof vi.fn> }>;
  const activeUsers = new Set([USER_ID]);
  const tokens: TokenService = {
    sign: vi.fn(),
    verify: (token) => {
      if (token === 'valid') return { userId: USER_ID };
      if (token === 'deleted-user') return { userId: OTHER_USER_ID };
      throw new UnauthorizedError('Token inválido o expirado');
    },
  };
  let server: Server;
  let baseUrl: string;

  const call = (method: string, path: string, options: { body?: unknown; token?: string | null } = {}) => {
    const { body, token = 'valid' } = options;
    return fetch(`${baseUrl}${resource.path}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(resource.path, resource.mount(useCases, authenticate(tokens, { isActive: async (id) => activeUsers.has(id) })));
    app.use(notFound);
    app.use(errorHandler);
    server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    for (const useCase of Object.values(useCases)) useCase.execute.mockReset();
  });

  const expectNoUseCaseCalled = () => {
    for (const useCase of Object.values(useCases)) expect(useCase.execute).not.toHaveBeenCalled();
  };

  describe('authentication (401)', () => {
    it.each([
      ['GET', '/', undefined],
      ['GET', `/${RESOURCE_ID}`, undefined],
      ['POST', '/', undefined],
      ['PATCH', `/${RESOURCE_ID}`, undefined],
      ['DELETE', `/${RESOURCE_ID}`, undefined],
    ])('%s %s without a token answers 401 and runs nothing', async (method, path) => {
      const response = await call(method, path, { token: null, body: method === 'POST' ? resource.validCreate : undefined });

      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe('UNAUTHORIZED');
      expectNoUseCaseCalled();
    });

    it('rejects an invalid or expired token', async () => {
      const response = await call('GET', '/', { token: 'garbage' });

      expect(response.status).toBe(401);
      expectNoUseCaseCalled();
    });

    it('rejects the token of a user that is no longer active', async () => {
      const response = await call('GET', '/', { token: 'deleted-user' });

      expect(response.status).toBe(401);
      expectNoUseCaseCalled();
    });

    it('authenticates before validating: an invalid body without a token is a 401, not a 400', async () => {
      const response = await call('POST', '/', { token: null, body: resource.invalidCreate });

      expect(response.status).toBe(401);
    });
  });

  describe('list', () => {
    it('answers 200 with the owner taken from the token and the default pagination', async () => {
      const rows = [{ id: RESOURCE_ID }];
      useCases.list.execute.mockResolvedValue(
        resource.paginatedByHeaders ? { data: rows, page: 1, limit: 50, total: 1 } : { data: rows, page: 1, limit: 20, total: 1 },
      );

      const response = await call('GET', '/');

      expect(response.status).toBe(200);
      expect(useCases.list.execute).toHaveBeenCalledWith(...resource.expectedListArgs);
      if (resource.paginatedByHeaders) {
        expect(await response.json()).toEqual(rows);
        expect(response.headers.get('X-Total-Count')).toBe('1');
        expect(response.headers.get('X-Page')).toBe('1');
        expect(response.headers.get('X-Limit')).toBe('50');
      } else {
        expect(await response.json()).toEqual({ data: rows, page: 1, limit: 20, total: 1 });
      }
    });

    it.each([['page=0'], ['limit=0'], ['limit=1000'], ['page=abc']])('rejects ?%s with 400', async (query) => {
      const response = await call('GET', `/?${query}`);

      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
      expect(useCases.list.execute).not.toHaveBeenCalled();
    });
  });

  describe('get by id', () => {
    it('answers 200 with the resource of the token owner', async () => {
      useCases.get.execute.mockResolvedValue({ id: RESOURCE_ID });

      const response = await call('GET', `/${RESOURCE_ID}`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ id: RESOURCE_ID });
      expect(useCases.get.execute).toHaveBeenCalledWith(RESOURCE_ID, USER_ID);
    });

    it('answers 400 when the id is not a UUID, without reaching the use case', async () => {
      const response = await call('GET', '/not-a-uuid');

      expect(response.status).toBe(400);
      expect((await response.json()).error.details[0].path).toBe('params.id');
      expect(useCases.get.execute).not.toHaveBeenCalled();
    });

    it("answers 404 for a resource of another user or one that does not exist", async () => {
      useCases.get.execute.mockRejectedValue(new NotFoundError(resource.notFoundMessage));

      const response = await call('GET', `/${RESOURCE_ID}`);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: { code: 'NOT_FOUND', message: resource.notFoundMessage } });
    });
  });

  describe('create', () => {
    it('answers 201 and hands the use case the parsed body and the owner of the token', async () => {
      useCases.create.execute.mockResolvedValue({ id: RESOURCE_ID });

      const response = await call('POST', '/', { body: resource.validCreate });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ id: RESOURCE_ID });
      const [input, userId] = useCases.create.execute.mock.calls[0]!;
      expect(userId).toBe(USER_ID);
      expect(input).toBeDefined();
    });

    it('trims and normalises the body before it reaches the use case', async () => {
      useCases.create.execute.mockResolvedValue({ id: RESOURCE_ID });

      await call('POST', '/', { body: resource.validCreate });

      const [input] = useCases.create.execute.mock.calls[0]!;
      if ('name' in resource.validCreate && resource.name === 'categories') expect(input.name).toBe('Mascotas');
      if ('currencyCode' in resource.validCreate && resource.validCreate.currencyCode === 'cop') {
        expect(input.currencyCode).toBe('COP');
      }
      if (resource.name === 'movements') expect(input.amount).toBe('85000');
    });

    it('does not let the client set a protected field', async () => {
      useCases.create.execute.mockResolvedValue({ id: RESOURCE_ID });

      await call('POST', '/', { body: { ...resource.validCreate, [resource.forbiddenField]: OTHER_USER_ID } });

      const [input, userId] = useCases.create.execute.mock.calls[0]!;
      expect(input).not.toHaveProperty(resource.forbiddenField);
      expect(userId).toBe(USER_ID);
    });

    it('answers 400 with the failing fields and does not run the use case', async () => {
      const response = await call('POST', '/', { body: resource.invalidCreate });

      expect(response.status).toBe(400);
      const { error } = await response.json();
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details.length).toBeGreaterThan(0);
      expect(error.details.every((d: { path: string }) => d.path.startsWith('body.'))).toBe(true);
      expect(useCases.create.execute).not.toHaveBeenCalled();
    });

    it('answers 400 for an empty body', async () => {
      const response = await call('POST', '/', { body: {} });

      expect(response.status).toBe(400);
      expect(useCases.create.execute).not.toHaveBeenCalled();
    });

    it('answers 400 INVALID_JSON for a malformed body', async () => {
      const response = await fetch(`${baseUrl}${resource.path}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json' },
        body: '{"name":',
      });

      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe('INVALID_JSON');
    });
  });

  describe('update', () => {
    it('answers 200 and passes the id, the body and the owner to the use case', async () => {
      useCases.update.execute.mockResolvedValue({ id: RESOURCE_ID });

      const response = await call('PATCH', `/${RESOURCE_ID}`, { body: resource.validUpdate });

      expect(response.status).toBe(200);
      expect(useCases.update.execute).toHaveBeenCalledWith(RESOURCE_ID, expect.objectContaining(resource.validUpdate), USER_ID);
    });

    it('answers 400 when no field is sent', async () => {
      const response = await call('PATCH', `/${RESOURCE_ID}`, { body: {} });

      expect(response.status).toBe(400);
      expect(useCases.update.execute).not.toHaveBeenCalled();
    });

    it('answers 400 when the id is not a UUID', async () => {
      const response = await call('PATCH', '/123', { body: resource.validUpdate });

      expect(response.status).toBe(400);
      expect(useCases.update.execute).not.toHaveBeenCalled();
    });

    it('answers 404 for a resource of another user or one that does not exist', async () => {
      useCases.update.execute.mockRejectedValue(new NotFoundError(resource.notFoundMessage));

      const response = await call('PATCH', `/${RESOURCE_ID}`, { body: resource.validUpdate });

      expect(response.status).toBe(404);
      expect((await response.json()).error.message).toBe(resource.notFoundMessage);
    });
  });

  describe('delete', () => {
    it('answers 200 with the confirmation message in Spanish', async () => {
      useCases.delete.execute.mockResolvedValue(undefined);

      const response = await call('DELETE', `/${RESOURCE_ID}`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ message: resource.deletedMessage });
      expect(useCases.delete.execute).toHaveBeenCalledWith(RESOURCE_ID, USER_ID);
    });

    it('answers 400 when the id is not a UUID', async () => {
      const response = await call('DELETE', '/xyz');

      expect(response.status).toBe(400);
      expect(useCases.delete.execute).not.toHaveBeenCalled();
    });

    it('answers 404 and no message for a resource of another user or one that does not exist', async () => {
      useCases.delete.execute.mockRejectedValue(new NotFoundError(resource.notFoundMessage));

      const response = await call('DELETE', `/${RESOURCE_ID}`);

      expect(response.status).toBe(404);
      expect(await response.json()).not.toHaveProperty('message');
    });
  });
});
