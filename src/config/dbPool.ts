// Pool size used when DB_POOL_MAX is not set (same as the pg default, now explicit).
export const DEFAULT_POOL_MAX = 10;

export interface PoolSettings {
  max: number;
  connectionTimeoutMillis?: number;
}

type Env = Record<string, string | undefined>;

function positiveInt(name: string, raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be an integer greater than 0 (received "${raw}")`);
  }
  return value;
}

// DB_POOL_MAX: connections per process. DB_POOL_CONNECTION_TIMEOUT_MS: how long a request may wait
// for a free connection; when it is not set there is NO timeout (requests queue until one frees up).
export function poolConfigFromEnv(env: Env = process.env): PoolSettings {
  const config: PoolSettings = {
    max: env.DB_POOL_MAX ? positiveInt('DB_POOL_MAX', env.DB_POOL_MAX) : DEFAULT_POOL_MAX,
  };
  if (env.DB_POOL_CONNECTION_TIMEOUT_MS) {
    config.connectionTimeoutMillis = positiveInt('DB_POOL_CONNECTION_TIMEOUT_MS', env.DB_POOL_CONNECTION_TIMEOUT_MS);
  }
  return config;
}
