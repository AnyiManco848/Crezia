// Performance-test safety net: with PERF_MODE=true the app and the perf DB scripts
// only accept a local database whose name ends in "_perf", so a load test or a
// reset can never touch Supabase or the development database by mistake.

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];
const PERF_DB_SUFFIX = '_perf';

export class PerfGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PerfGuardError';
  }
}

type Env = Record<string, string | undefined>;

// Throws unless url points to localhost/127.0.0.1 and a database ending in "_perf".
export function assertPerfDatabaseUrl(name: string, url: string | undefined): void {
  if (!url) {
    throw new PerfGuardError(`Modo perf: falta ${name}. Revisa el archivo .env.perf.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new PerfGuardError(`Modo perf: ${name} no es una URL de conexión válida.`);
  }

  const host = parsed.hostname;
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));

  if (!LOCAL_HOSTS.includes(host)) {
    throw new PerfGuardError(
      `Modo perf: ${name} apunta al host "${host}". Solo se permite localhost o 127.0.0.1 para no tocar otra base de datos.`,
    );
  }
  if (!database.endsWith(PERF_DB_SUFFIX)) {
    throw new PerfGuardError(
      `Modo perf: ${name} apunta a la base de datos "${database || '(vacía)'}". El nombre debe terminar en "${PERF_DB_SUFFIX}".`,
    );
  }
}

// For the server: does nothing unless PERF_MODE=true, so the normal start with .env is unchanged.
export function guardPerfMode(env: Env = process.env): void {
  if (env.PERF_MODE !== 'true') return;
  assertPerfDatabaseUrl('DATABASE_URL', env.DATABASE_URL);
  if (env.DIRECT_URL !== undefined) assertPerfDatabaseUrl('DIRECT_URL', env.DIRECT_URL);
}

// For the scripts that reset or fill the perf database: PERF_MODE=true is mandatory
// and both URLs must be present, because the Prisma CLI falls back to .env for any missing one.
export function requirePerfMode(env: Env = process.env): void {
  if (env.PERF_MODE !== 'true') {
    throw new PerfGuardError(
      'Este script solo corre en modo perf (PERF_MODE=true). Úsalo con npm run db:perf:reset o npm run db:perf:seed.',
    );
  }
  assertPerfDatabaseUrl('DATABASE_URL', env.DATABASE_URL);
  assertPerfDatabaseUrl('DIRECT_URL', env.DIRECT_URL);
}
