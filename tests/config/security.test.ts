import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOGIN_RATE_LIMIT,
  DEFAULT_REGISTER_RATE_LIMIT,
  parseTrustProxy,
  readLoginRateLimit,
  readRegisterRateLimit,
  TEST_MODE_LOGIN_RATE_LIMIT_MAX,
} from '../../src/config/security';

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

describe('readLoginRateLimit', () => {
  it('defaults to 10 attempts every 15 minutes', () => {
    expect(readLoginRateLimit({})).toEqual(DEFAULT_LOGIN_RATE_LIMIT);
    expect(DEFAULT_LOGIN_RATE_LIMIT).toEqual({ windowMs: 900_000, limit: 10 });
  });

  it('reads overrides and rejects invalid values', () => {
    expect(readLoginRateLimit({ LOGIN_RATE_LIMIT_MAX: '5', LOGIN_RATE_LIMIT_WINDOW_MS: '60000' })).toEqual({ limit: 5, windowMs: 60_000 });
    expect(() => readLoginRateLimit({ LOGIN_RATE_LIMIT_MAX: '0' })).toThrow(/LOGIN_RATE_LIMIT_MAX/);
    expect(() => readLoginRateLimit({ LOGIN_RATE_LIMIT_WINDOW_MS: 'abc' })).toThrow(/LOGIN_RATE_LIMIT_WINDOW_MS/);
  });

  it('uses a controlled high limit only in TEST_MODE without an explicit value', () => {
    expect(readLoginRateLimit({ TEST_MODE: 'true' }).limit).toBe(TEST_MODE_LOGIN_RATE_LIMIT_MAX);
    expect(readLoginRateLimit({ TEST_MODE: 'true', LOGIN_RATE_LIMIT_MAX: '5' }).limit).toBe(5);
    expect(readLoginRateLimit({ TEST_MODE: 'false' }).limit).toBe(DEFAULT_LOGIN_RATE_LIMIT.limit);
    expect(readLoginRateLimit({ PERF_MODE: 'true' }).limit).toBe(DEFAULT_LOGIN_RATE_LIMIT.limit);
  });
});
