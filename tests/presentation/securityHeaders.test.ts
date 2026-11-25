import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import type { Container } from '../../src/infrastructure/container';

const ALLOWED = 'https://crezia.example.com';
const OTHER = 'https://evil.example.com';

// The real app over an HTTP server (/api/health needs no use case or database).
describe('CORS origins and security headers', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp({} as Container, { corsOrigins: [ALLOWED, 'http://localhost:5173'] });
    server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  describe('CORS_ORIGINS list', () => {
    it('lets a listed origin read the response and tells caches the answer depends on Origin', async () => {
      const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: ALLOWED } });

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe(ALLOWED);
      expect(response.headers.get('vary')?.toLowerCase()).toContain('origin');
    });

    it('does not authorise an origin that is not in the list', async () => {
      const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: OTHER } });

      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('never answers with a wildcard', async () => {
      const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: ALLOWED } });

      expect(response.headers.get('access-control-allow-origin')).not.toBe('*');
    });

    it('answers the preflight of a listed origin and refuses the others', async () => {
      const preflight = (origin: string) =>
        fetch(`${baseUrl}/api/goals`, {
          method: 'OPTIONS',
          headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' },
        });

      const ok = await preflight(ALLOWED);
      expect(ok.status).toBe(204);
      expect(ok.headers.get('access-control-allow-origin')).toBe(ALLOWED);
      expect(ok.headers.get('access-control-allow-methods')).toContain('POST');
      expect(ok.headers.get('access-control-allow-headers')?.toLowerCase()).toContain('authorization');

      const refused = await preflight(OTHER);
      expect(refused.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('still serves requests that carry no Origin (curl, health checks, server to server)', async () => {
      const response = await fetch(`${baseUrl}/api/health`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'ok' });
    });
  });

  describe('helmet', () => {
    it('sends the security headers and hides the framework', async () => {
      const response = await fetch(`${baseUrl}/api/health`);

      expect(response.headers.get('x-powered-by')).toBeNull();
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('referrer-policy')).toBe('no-referrer');
      expect(response.headers.get('strict-transport-security')).toContain('max-age=');
      expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    });

    it('uses a policy that loads nothing and forbids framing', async () => {
      const csp = (await fetch(`${baseUrl}/api/health`)).headers.get('content-security-policy') ?? '';

      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('also protects error responses', async () => {
      const response = await fetch(`${baseUrl}/api/does-not-exist`);

      expect(response.status).toBe(404);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });
});
