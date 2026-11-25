// Security settings read from environment variables. Pure functions so they can be tested without a server.

// Express setting "trust proxy": tells Express how many proxies sit in front of the API, so req.ip (which
// the rate limiter uses) is the real client and not the proxy. Off by default: the API runs locally with no
// proxy. Accepted values: unset / "false" / "0" (off), a number of proxies (e.g. "1"), or a list of
// addresses / names such as "loopback, 10.0.0.0/8". "true" is rejected: it would trust any X-Forwarded-For,
// letting a client fake its IP and skip the limit.
export function parseTrustProxy(raw: string | undefined): boolean | number | string {
  const value = raw?.trim() ?? '';
  if (value === '' || value.toLowerCase() === 'false') return false;
  if (value.toLowerCase() === 'true') {
    throw new Error(
      'TRUST_PROXY=true no es válido: confiaría en cualquier cabecera X-Forwarded-For. ' +
        'Usa el número de proxies delante de la API (por ejemplo 1) o una lista de IP/CIDR.',
    );
  }
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

export interface RegisterRateLimitConfig {
  windowMs: number;
  limit: number;
}

export const DEFAULT_REGISTER_RATE_LIMIT: RegisterRateLimitConfig = { windowMs: 15 * 60 * 1000, limit: 10 };

export interface RateLimitConfig {
  windowMs: number;
  limit: number;
}

// Login attempts per IP and window (D-9). EVERY attempt counts, successful or not: refunding the successful ones would let an
// attacker with their own account reset the counter between guesses.
export const DEFAULT_LOGIN_RATE_LIMIT: RateLimitConfig = { windowMs: 15 * 60 * 1000, limit: 10 };

// Controlled high limit used ONLY when TEST_MODE=true and LOGIN_RATE_LIMIT_MAX is not set, so the API suite (which logs in many
// times from one IP) does not block itself. The production guard refuses to start with TEST_MODE or with any LOGIN_RATE_LIMIT_*.
export const TEST_MODE_LOGIN_RATE_LIMIT_MAX = 1000;

function positiveInteger(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} debe ser un entero mayor o igual a 1`);
  return value;
}

// Registration attempts per IP and window. Defaults: 10 attempts every 15 minutes (decision D-5).
// The variables exist so the test database can raise the limit; do not raise it in production.
export function readRegisterRateLimit(env: Record<string, string | undefined> = process.env): RegisterRateLimitConfig {
  return {
    windowMs: positiveInteger(env.REGISTER_RATE_LIMIT_WINDOW_MS, DEFAULT_REGISTER_RATE_LIMIT.windowMs, 'REGISTER_RATE_LIMIT_WINDOW_MS'),
    limit: positiveInteger(env.REGISTER_RATE_LIMIT_MAX, DEFAULT_REGISTER_RATE_LIMIT.limit, 'REGISTER_RATE_LIMIT_MAX'),
  };
}

export function readLoginRateLimit(env: Record<string, string | undefined> = process.env): RateLimitConfig {
  const testMode = env.TEST_MODE === 'true';
  const hasMax = env.LOGIN_RATE_LIMIT_MAX !== undefined && env.LOGIN_RATE_LIMIT_MAX.trim() !== '';
  return {
    windowMs: positiveInteger(env.LOGIN_RATE_LIMIT_WINDOW_MS, DEFAULT_LOGIN_RATE_LIMIT.windowMs, 'LOGIN_RATE_LIMIT_WINDOW_MS'),
    limit: positiveInteger(
      env.LOGIN_RATE_LIMIT_MAX,
      testMode && !hasMax ? TEST_MODE_LOGIN_RATE_LIMIT_MAX : DEFAULT_LOGIN_RATE_LIMIT.limit,
      'LOGIN_RATE_LIMIT_MAX',
    ),
  };
}
