import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import type { Container } from '../../src/infrastructure/container';

// The real app over an HTTP server. /api/health and the registration limiter need no use case or database, so an
// empty container is enough.
describe('CORS - exposed response headers', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp({} as Container, { registerRateLimit: { windowMs: 60_000, limit: 1 } });
    server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const exposed = (response: Response) =>
    (response.headers.get('access-control-expose-headers') ?? '').split(',').map((name) => name.trim().toLowerCase());

  it('exposes Retry-After so a browser on another origin can read it', async () => {
    const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'http://localhost:5173' } });

    expect(exposed(response)).toContain('retry-after');
  });

  it('keeps exposing the pagination headers', async () => {
    const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'http://localhost:5173' } });

    expect(exposed(response)).toEqual(expect.arrayContaining(['x-total-count', 'x-page', 'x-limit']));
  });

  it('sends Retry-After and exposes it on the 429 of the registration limiter', async () => {
    const post = () =>
      fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
        body: '{}',
      });

    await post(); // the first attempt uses up the limit (it ends in a 400: empty body)
    const limited = await post();

    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(exposed(limited)).toContain('retry-after');
  });
});
