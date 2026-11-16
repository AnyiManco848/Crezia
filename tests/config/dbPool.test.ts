import { describe, expect, it } from 'vitest';
import { DEFAULT_POOL_MAX, poolConfigFromEnv } from '../../src/config/dbPool';

describe('poolConfigFromEnv', () => {
  it('uses the explicit default max and no connection timeout', () => {
    const config = poolConfigFromEnv({});
    expect(config).toEqual({ max: DEFAULT_POOL_MAX });
    expect('connectionTimeoutMillis' in config).toBe(false);
  });

  it('reads max and the connection timeout from the environment', () => {
    expect(poolConfigFromEnv({ DB_POOL_MAX: '25', DB_POOL_CONNECTION_TIMEOUT_MS: '5000' })).toEqual({
      max: 25,
      connectionTimeoutMillis: 5000,
    });
  });

  it.each([[{ DB_POOL_MAX: '0' }], [{ DB_POOL_MAX: 'ten' }], [{ DB_POOL_CONNECTION_TIMEOUT_MS: '-1' }]])(
    'rejects invalid values %j',
    (env) => {
      expect(() => poolConfigFromEnv(env)).toThrow();
    },
  );
});
