import { describe, expect, it } from 'vitest';
import { assertProductionEnv, checkProductionEnv, ProductionGuardError } from '../../src/config/productionGuard';

const GOOD = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@host:6543/postgres',
  JWT_SECRET: 'q7H2x9Vn5Lk0RtB8mZc3Yw6Pd1Fs4GaJ-ExampleOnlyRandom',
  CORS_ORIGINS: 'https://crezia.example.com',
  TRUST_PROXY: '1',
};

describe('checkProductionEnv', () => {
  it('does nothing outside production, whatever the settings', () => {
    expect(checkProductionEnv({ NODE_ENV: 'development', TEST_MODE: 'true', JWT_SECRET: 'x' })).toEqual({ errors: [], warnings: [] });
    expect(checkProductionEnv({})).toEqual({ errors: [], warnings: [] });
  });

  it('accepts a correct production configuration', () => {
    expect(checkProductionEnv(GOOD)).toEqual({ errors: [], warnings: [] });
  });

  it('refuses TEST_MODE and PERF_MODE', () => {
    const { errors } = checkProductionEnv({ ...GOOD, TEST_MODE: 'true', PERF_MODE: 'true' });
    expect(errors.join('\n')).toMatch(/TEST_MODE/);
    expect(errors.join('\n')).toMatch(/PERF_MODE/);
  });

  it('refuses a missing, short or placeholder JWT_SECRET', () => {
    expect(checkProductionEnv({ ...GOOD, JWT_SECRET: undefined }).errors.join()).toMatch(/JWT_SECRET/);
    expect(checkProductionEnv({ ...GOOD, JWT_SECRET: 'corto' }).errors.join()).toMatch(/al menos 32/);
    expect(checkProductionEnv({ ...GOOD, JWT_SECRET: 'change-me-to-a-long-random-string-123456' }).errors.join()).toMatch(/ejemplo/);
  });

  it('requires DATABASE_URL', () => {
    expect(checkProductionEnv({ ...GOOD, DATABASE_URL: undefined }).errors.join()).toMatch(/DATABASE_URL/);
  });

  it('requires CORS_ORIGINS and refuses localhost in it', () => {
    expect(checkProductionEnv({ ...GOOD, CORS_ORIGINS: undefined }).errors.join()).toMatch(/obligatoria/);
    expect(checkProductionEnv({ ...GOOD, CORS_ORIGINS: 'https://crezia.example.com,http://localhost:5173' }).errors.join()).toMatch(/localhost/);
    expect(checkProductionEnv({ ...GOOD, CORS_ORIGINS: 'http://127.0.0.1:5173' }).errors.join()).toMatch(/localhost/);
  });

  it('refuses raised registration limits', () => {
    expect(checkProductionEnv({ ...GOOD, REGISTER_RATE_LIMIT_MAX: '1000' }).errors.join()).toMatch(/REGISTER_RATE_LIMIT/);
    expect(checkProductionEnv({ ...GOOD, REGISTER_RATE_LIMIT_WINDOW_MS: '1000' }).errors.join()).toMatch(/REGISTER_RATE_LIMIT/);
  });

  it('refuses raised login limits and the TEST_MODE that raises them (D-9)', () => {
    expect(checkProductionEnv({ ...GOOD, LOGIN_RATE_LIMIT_MAX: '1000' }).errors.join()).toMatch(/LOGIN_RATE_LIMIT/);
    expect(checkProductionEnv({ ...GOOD, LOGIN_RATE_LIMIT_WINDOW_MS: '1000' }).errors.join()).toMatch(/LOGIN_RATE_LIMIT/);
    // The high default of TEST_MODE can only be active with TEST_MODE=true, which the guard already refuses.
    expect(() => assertProductionEnv({ ...GOOD, TEST_MODE: 'true' })).toThrow(ProductionGuardError);
  });

  it('only warns when TRUST_PROXY is missing', () => {
    const result = checkProductionEnv({ ...GOOD, TRUST_PROXY: undefined });
    expect(result.errors).toEqual([]);
    expect(result.warnings.join()).toMatch(/TRUST_PROXY/);
  });
});

describe('assertProductionEnv', () => {
  it('returns the warnings when the configuration is valid', () => {
    expect(assertProductionEnv({ ...GOOD, TRUST_PROXY: '' })).toHaveLength(1);
  });

  it('throws one error listing every problem', () => {
    expect.assertions(3);
    try {
      assertProductionEnv({ NODE_ENV: 'production', TEST_MODE: 'true' });
    } catch (err) {
      expect(err).toBeInstanceOf(ProductionGuardError);
      expect((err as ProductionGuardError).problems.length).toBeGreaterThanOrEqual(4);
      expect((err as Error).message).toMatch(/TEST_MODE/);
    }
  });
});
