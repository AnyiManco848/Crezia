import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { INVALID_CREDENTIALS_MESSAGE, LoginUseCase } from '../../../src/application/auth/LoginUseCase';
import { RegisterUserUseCase } from '../../../src/application/auth/RegisterUserUseCase';
import { REGISTRATION_CONFLICT_MESSAGE } from '../../../src/domain/errors';
import { AuthController } from '../../../src/presentation/controllers/AuthController';
import { errorHandler, notFound } from '../../../src/presentation/middlewares/errorHandler';
import { createLoginRateLimiter, createRegisterRateLimiter } from '../../../src/presentation/middlewares/rateLimit';
import { authRoutes } from '../../../src/presentation/routes/authRoutes';
import { InMemoryUserRepository } from '../../helpers/InMemoryUserRepository';

const BODY = {
  name: 'Camila Rodríguez',
  documentId: '1000000002',
  birthDate: '1995-03-10',
  email: 'camila@crezia.com',
  password: 'Clave1234',
};

// Real router, limiter, validation and error handler over HTTP; only storage, hashing and tokens are fakes.
async function startServer(limit: number) {
  const users = new InMemoryUserRepository();
  const useCase = new RegisterUserUseCase(
    users,
    { isActive: async (code) => code === 'COP' || code === 'USD' },
    { hash: async (plain) => `hashed-${plain}`, compare: vi.fn() },
    { sign: () => 'signed-token', verify: vi.fn() },
  );
  const controller = new AuthController({ execute: vi.fn() } as unknown as LoginUseCase, useCase);
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes(controller, createRegisterRateLimiter({ windowMs: 60_000, limit })));
  app.use(notFound);
  app.use(errorHandler);
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (body: unknown) =>
    fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  return { users, post, close };
}

describe('POST /api/auth/register', () => {
  let ctx: Awaited<ReturnType<typeof startServer>>;
  beforeAll(async () => {
    ctx = await startServer(50);
  });
  afterAll(() => ctx.close());

  it('answers 201 with token and user, no password data, and ignores a role in the body', async () => {
    const response = await ctx.post({ ...BODY, role: 'Admin' });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.token).toBe('signed-token');
    expect(body.user).toMatchObject({ email: 'camila@crezia.com', role: 'User', preferredCurrencyCode: 'COP' });
    expect(JSON.stringify(body)).not.toMatch(/hash|Clave1234/i);
    expect(ctx.users.rows[0]?.role).toBe('User');
  });

  it('answers 409 with the same generic message for a repeated email and a repeated document id', async () => {
    const sameEmail = await ctx.post({ ...BODY, documentId: '2000000000' });
    const sameDocument = await ctx.post({ ...BODY, email: 'otra@crezia.com' });

    expect(sameEmail.status).toBe(409);
    expect(sameDocument.status).toBe(409);
    const [a, b] = await Promise.all([sameEmail.json(), sameDocument.json()]);
    expect(a).toEqual(b);
    expect(a.error.message).toBe(REGISTRATION_CONFLICT_MESSAGE);
  });

  it('answers 400 with per-field details in Spanish', async () => {
    const response = await ctx.post({ ...BODY, password: '123', birthDate: '2020-01-01' });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    const paths = body.error.details.map((detail: { path: string }) => detail.path);
    expect(paths).toEqual(expect.arrayContaining(['body.password', 'body.birthDate']));
  });

  it('answers 429 with Retry-After after the limit, counting invalid attempts too', async () => {
    const limited = await startServer(3);
    try {
      expect((await limited.post({})).status).toBe(400);
      expect((await limited.post({})).status).toBe(400);
      expect((await limited.post(BODY)).status).toBe(201);
      const blocked = await limited.post(BODY);

      expect(blocked.status).toBe(429);
      expect((await blocked.json()).error.code).toBe('TOO_MANY_REQUESTS');
      expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    } finally {
      await limited.close();
    }
  });
});

// Login over HTTP with the real LoginUseCase, limiters, validation and error handler; storage, hashing and tokens are fakes.
async function startLoginServer(loginLimit: number) {
  const users = new InMemoryUserRepository();
  const hasher = {
    hash: async (plain: string) => `hashed-${plain}`,
    compare: async (plain: string, hash: string) => hash === `hashed-${plain}`,
  };
  const tokens = { sign: () => 'signed-token', verify: vi.fn() };
  await users.create({
    documentId: '1000000009',
    name: 'Laura Pérez',
    email: 'laura@crezia.com',
    passwordHash: 'hashed-Clave1234',
    birthDate: '1990-01-01',
    phone: null,
    preferredCurrencyCode: 'COP',
  });
  const controller = new AuthController(new LoginUseCase(users, hasher, tokens), { execute: vi.fn() } as unknown as RegisterUserUseCase);
  const app = express();
  app.use(express.json());
  app.use(
    '/api/auth',
    authRoutes(
      controller,
      createRegisterRateLimiter({ windowMs: 60_000, limit: 50 }),
      createLoginRateLimiter({ windowMs: 60_000, limit: loginLimit }),
    ),
  );
  app.use(notFound);
  app.use(errorHandler);
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const send = (path: string, body: unknown) =>
    fetch(`${baseUrl}/api/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const post = (body: unknown) => send('login', body);
  const close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  return { users, post, send, close };
}

describe('POST /api/auth/login', () => {
  it('accepts the email in any capitalization and with surrounding spaces (D-4)', async () => {
    const ctx = await startLoginServer(50);
    try {
      for (const email of ['LAURA@CREZIA.COM', '  Laura@Crezia.com  ', 'laura@crezia.com']) {
        const response = await ctx.post({ email, password: 'Clave1234' });
        const body = await response.json();

        expect(response.status, email).toBe(200);
        expect(body.token).toBe('signed-token');
        expect(body.user.email).toBe('laura@crezia.com');
      }
    } finally {
      await ctx.close();
    }
  });

  it('answers 401 with the same generic message for a wrong password and for an unknown email', async () => {
    const ctx = await startLoginServer(50);
    try {
      const wrong = await ctx.post({ email: 'LAURA@crezia.com', password: 'Otra1234' });
      const unknown = await ctx.post({ email: 'nadie@crezia.com', password: 'Clave1234' });

      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect((await wrong.json()).error.message).toBe(INVALID_CREDENTIALS_MESSAGE);
      expect((await unknown.json()).error.message).toBe(INVALID_CREDENTIALS_MESSAGE);
    } finally {
      await ctx.close();
    }
  });

  it('answers the same generic 401 for a soft-deleted user, even with the right password', async () => {
    const ctx = await startLoginServer(50);
    try {
      ctx.users.rows[0]!.deletedAt = new Date();
      const response = await ctx.post({ email: 'laura@crezia.com', password: 'Clave1234' });

      expect(response.status).toBe(401);
      expect((await response.json()).error.message).toBe(INVALID_CREDENTIALS_MESSAGE);
    } finally {
      await ctx.close();
    }
  });

  it('answers 429 with Retry-After and a Spanish message after the limit, counting invalid and successful attempts (D-9)', async () => {
    const ctx = await startLoginServer(3);
    try {
      expect((await ctx.post({})).status).toBe(400);
      expect((await ctx.post({ email: 'laura@crezia.com', password: 'mala1234' })).status).toBe(401);
      expect((await ctx.post({ email: 'laura@crezia.com', password: 'Clave1234' })).status).toBe(200);
      const blocked = await ctx.post({ email: 'laura@crezia.com', password: 'Clave1234' });
      const body = await blocked.json();

      expect(blocked.status).toBe(429);
      expect(body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(body.error.message).toBe('Demasiados intentos. Inténtalo de nuevo en unos minutos.');
      expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    } finally {
      await ctx.close();
    }
  });

  it('keeps the login and registration counters separate', async () => {
    const ctx = await startLoginServer(1);
    try {
      expect((await ctx.post({})).status).toBe(400);
      expect((await ctx.post({})).status).toBe(429);
      // Registration has its own quota: login being blocked does not block it (here it answers 400 for the empty body).
      expect((await ctx.send('register', {})).status).toBe(400);
    } finally {
      await ctx.close();
    }
  });
});
