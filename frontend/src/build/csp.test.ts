import { describe, expect, it } from 'vitest';
import { buildCsp, resolveApiOrigin } from './csp';

const PROD = { production: true };

describe('resolveApiOrigin', () => {
  it('uses VITE_API_URL, or localhost:3000, in development', () => {
    expect(resolveApiOrigin(undefined, { production: false })).toBe('http://localhost:3000');
    expect(resolveApiOrigin('', { production: false })).toBe('http://localhost:3000');
    expect(resolveApiOrigin('http://localhost:3999/', { production: false })).toBe('http://localhost:3999');
  });

  it('returns only the origin of a production URL (no path, no trailing slash)', () => {
    expect(resolveApiOrigin('https://api.crezia.com/', PROD)).toBe('https://api.crezia.com');
    expect(resolveApiOrigin(' https://crezia-api.up.railway.app/api ', PROD)).toBe('https://crezia-api.up.railway.app');
  });

  it('requires VITE_API_URL in a production build instead of falling back to localhost', () => {
    expect(() => resolveApiOrigin(undefined, PROD)).toThrow(/Falta VITE_API_URL/);
    expect(() => resolveApiOrigin('   ', PROD)).toThrow(/Falta VITE_API_URL/);
  });

  it('refuses a local, non-https or invalid API in production', () => {
    expect(() => resolveApiOrigin('http://localhost:3000', PROD)).toThrow(/localhost/);
    expect(() => resolveApiOrigin('https://127.0.0.1:3000', PROD)).toThrow(/127\.0\.0\.1/);
    expect(() => resolveApiOrigin('http://api.crezia.com', PROD)).toThrow(/https/);
    expect(() => resolveApiOrigin('api.crezia.com', PROD)).toThrow(/no es una URL válida/);
  });

  it('allows a local API in a production build only with the explicit local override', () => {
    expect(resolveApiOrigin('http://localhost:3000', { production: true, allowLocal: true })).toBe('http://localhost:3000');
    expect(() => resolveApiOrigin(undefined, { production: true, allowLocal: true })).toThrow(/Falta VITE_API_URL/);
  });
});

describe('buildCsp', () => {
  const prod = buildCsp({ apiOrigin: 'https://api.crezia.com', dev: false });

  it('production: connect-src lists the API and nothing local', () => {
    expect(prod).toContain("connect-src 'self' https://api.crezia.com");
    expect(prod).not.toMatch(/localhost|127\.0\.0\.1|ws:/);
  });

  it('production: no inline script, no eval, no inline style', () => {
    expect(prod).toContain("script-src 'self'");
    expect(prod).not.toMatch(/unsafe-inline|unsafe-eval/);
  });

  it('production: blocks plugins, base tag hijacking and foreign forms', () => {
    expect(prod).toContain("object-src 'none'");
    expect(prod).toContain("base-uri 'self'");
    expect(prod).toContain("form-action 'self'");
  });

  it('development: allows the Vite preamble and the HMR WebSocket', () => {
    const dev = buildCsp({ apiOrigin: 'http://localhost:3000', dev: true });
    expect(dev).toContain("script-src 'self' 'unsafe-inline'");
    expect(dev).toContain('ws://localhost:*');
    expect(dev).toContain("connect-src 'self' http://localhost:3000");
  });
});
