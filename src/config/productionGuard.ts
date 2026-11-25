// Production safety net: with NODE_ENV=production the server refuses to start with settings that only make sense in
// development or in the test/perf setups. It does nothing outside production, so local work is unchanged.
// Pure function over an env object so it can be tested.

type Env = Record<string, string | undefined>;

export class ProductionGuardError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Configuración no válida para producción:\n- ${problems.join('\n- ')}`);
    this.name = 'ProductionGuardError';
  }
}

export const MIN_JWT_SECRET_LENGTH = 32;

// Values copied from .env.example or typical placeholders. Not exhaustive: the length rule is the real defence.
const PLACEHOLDER_SECRETS = ['change-me', 'changeme', 'secret', 'password', 'jwt_secret', 'your-secret'];

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export function isProduction(env: Env = process.env): boolean {
  return env.NODE_ENV === 'production';
}

// Returns the list of problems (empty = fine). Warnings do not stop the server.
export function checkProductionEnv(env: Env = process.env): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isProduction(env)) return { errors, warnings };

  if (env.TEST_MODE === 'true') errors.push('TEST_MODE=true no debe existir en producción (solo para la base de pruebas).');
  if (env.PERF_MODE === 'true') errors.push('PERF_MODE=true no debe existir en producción (solo para pruebas de carga locales).');

  const secret = env.JWT_SECRET ?? '';
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(`JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres (genera uno aleatorio, ver README).`);
  } else if (PLACEHOLDER_SECRETS.some((p) => secret.toLowerCase().includes(p))) {
    errors.push('JWT_SECRET parece un valor de ejemplo. Genera uno aleatorio (ver README).');
  }

  if (!env.DATABASE_URL) errors.push('Falta DATABASE_URL.');

  const origins = (env.CORS_ORIGINS ?? '').trim();
  if (origins === '') {
    errors.push('CORS_ORIGINS es obligatoria en producción (la URL del front, por ejemplo https://crezia.vercel.app).');
  } else if (origins.split(',').some((o) => LOCAL_HOSTS.some((h) => o.includes(`//${h}`)))) {
    errors.push('CORS_ORIGINS contiene localhost: quítalo en producción.');
  }

  // Raised registration limits are only for the test database; they remove the brute-force protection.
  if (env.REGISTER_RATE_LIMIT_MAX || env.REGISTER_RATE_LIMIT_WINDOW_MS) {
    errors.push('REGISTER_RATE_LIMIT_MAX / REGISTER_RATE_LIMIT_WINDOW_MS no deben definirse en producción (usa los valores por defecto).');
  }

  // Same for the login limit (D-9). TEST_MODE already stops the server above; this also catches a raised limit set on its own.
  if (env.LOGIN_RATE_LIMIT_MAX || env.LOGIN_RATE_LIMIT_WINDOW_MS) {
    errors.push('LOGIN_RATE_LIMIT_MAX / LOGIN_RATE_LIMIT_WINDOW_MS no deben definirse en producción (usa los valores por defecto).');
  }

  if ((env.TRUST_PROXY ?? '').trim() === '') {
    warnings.push('TRUST_PROXY no está definida: detrás de un proxy (Railway) todos los clientes compartirían el mismo límite de registro y de inicio de sesión. Ver README.');
  }

  return { errors, warnings };
}

// Throws ProductionGuardError when there is any error; returns the warnings to log.
export function assertProductionEnv(env: Env = process.env): string[] {
  const { errors, warnings } = checkProductionEnv(env);
  if (errors.length > 0) throw new ProductionGuardError(errors);
  return warnings;
}
