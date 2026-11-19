import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'dotenv';

// Safety net for everything that writes to the TEST database (API tests, their cleanup, the migrate and
// seed scripts). With TEST_MODE=true (set in .env.test) it refuses to run when DATABASE_URL or DIRECT_URL
// is missing (the Prisma CLI would silently fall back to the real .env) or points to the same Supabase
// project / database as the real .env. It cannot know a database is "the test one": it can only prove it
// is NOT the real one, so it also asks for an explicit confirmation flag in the API test runs.

export class TestDbGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestDbGuardError';
  }
}

type Env = Record<string, string | undefined>;

// Identity of a connection string without ever exposing its password: Supabase project ref (the part
// after "postgres." in the user) when there is one, otherwise "host/database".
export function databaseIdentity(url: string): string {
  const parsed = new URL(url);
  const user = decodeURIComponent(parsed.username);
  const ref = user.startsWith('postgres.') ? user.slice('postgres.'.length) : null;
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  return ref ? `supabase:${ref}` : `${parsed.hostname}:${parsed.port || '5432'}/${database}`;
}

function identityOf(name: string, url: string | undefined): string {
  if (!url) throw new TestDbGuardError(`Modo prueba: falta ${name}. Revisa el archivo .env.test (las cuatro variables).`);
  try {
    return databaseIdentity(url);
  } catch {
    throw new TestDbGuardError(`Modo prueba: ${name} no es una URL de conexión válida.`);
  }
}

// Reads DATABASE_URL and DIRECT_URL from the real .env, if it exists. Read-only; the values are never printed.
export function readRealDatabaseUrls(cwd = process.cwd()): string[] {
  const file = path.join(cwd, '.env');
  if (!fs.existsSync(file)) return [];
  const values = parse(fs.readFileSync(file));
  return [values.DATABASE_URL, values.DIRECT_URL].filter((value): value is string => Boolean(value));
}

export function assertTestDatabase(env: Env = process.env, realUrls: string[] = readRealDatabaseUrls()): void {
  if (env.TEST_MODE !== 'true') {
    throw new TestDbGuardError(
      'Esto solo corre en modo prueba (TEST_MODE=true). Usa los comandos npm run db:test:* y npm run test:api:test, que cargan .env.test.',
    );
  }
  const identities = [identityOf('DATABASE_URL', env.DATABASE_URL), identityOf('DIRECT_URL', env.DIRECT_URL)];
  const real = new Set<string>();
  for (const url of realUrls) {
    try {
      real.add(databaseIdentity(url));
    } catch {
      // An unparsable URL in the real .env cannot match anything.
    }
  }
  for (const identity of identities) {
    if (real.has(identity)) {
      throw new TestDbGuardError(
        'Modo prueba: DATABASE_URL o DIRECT_URL apuntan a la misma base que tu .env real. Se detiene para no tocar datos reales.',
      );
    }
  }
}

// For the API test runs: on top of assertTestDatabase, the person must confirm the database is the test one.
export function assertApiTestRun(env: Env = process.env, realUrls?: string[]): void {
  assertTestDatabase(env, realUrls);
  if (env.E2E_TEST_DB_CONFIRMED !== 'true') {
    throw new TestDbGuardError(
      'Falta E2E_TEST_DB_CONFIRMED=true: confirma que .env.test apunta a la base de PRUEBAS antes de correr las pruebas que crean datos.',
    );
  }
}
