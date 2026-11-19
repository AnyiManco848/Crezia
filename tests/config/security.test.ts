import { describe, expect, it } from 'vitest';
import { DEFAULT_REGISTER_RATE_LIMIT, parseTrustProxy, readRegisterRateLimit } from '../../src/config/security';

describe('parseTrustProxy', () => {
  it.each([undefined, '', '  ', 'false', 'FALSE'])('is off for %j', (raw) => {
    expect(parseTrustProxy(raw)).toBe(false);
  });

  it('reads a number of proxies and a list of addresses', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('loopback, 10.0.0.0/8')).toBe('loopback, 10.0.0.0/8');
  });

  it('rejects "true", which would trust any X-Forwarded-For', () => {
    expect(() => parseTrustProxy('true')).toThrow(/TRUST_PROXY=true no es válido/);
  });
});

describe('readRegisterRateLimit', () => {
  it('defaults to 10 attempts every 15 minutes', () => {
    expect(readRegisterRateLimit({})).toEqual(DEFAULT_REGISTER_RATE_LIMIT);
    expect(DEFAULT_REGISTER_RATE_LIMIT).toEqual({ windowMs: 900_000, limit: 10 });
  });

  it('reads overrides and rejects invalid values', () => {
    const env = { REGISTER_RATE_LIMIT_MAX: '100', REGISTER_RATE_LIMIT_WINDOW_MS: '60000' };

    expect(readRegisterRateLimit(env)).toEqual({ limit: 100, windowMs: 60_000 });
    expect(() => readRegisterRateLimit({ REGISTER_RATE_LIMIT_MAX: '0' })).toThrow(/REGISTER_RATE_LIMIT_MAX/);
    expect(() => readRegisterRateLimit({ REGISTER_RATE_LIMIT_MAX: 'abc' })).toThrow();
  });
});
