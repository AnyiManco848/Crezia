import { describe, expect, it } from 'vitest';
import { assertApiTestRun, assertTestDatabase, databaseIdentity, TestDbGuardError } from '../../src/config/testDbGuard';

const REAL = 'postgresql://postgres.realref:secret@aws-0-us.pooler.supabase.com:6543/postgres?pgbouncer=true';
const REAL_DIRECT = 'postgresql://postgres.realref:secret@aws-0-us.pooler.supabase.com:5432/postgres';
const TEST = 'postgresql://postgres.testref:other@aws-0-us.pooler.supabase.com:6543/postgres?pgbouncer=true';
const TEST_DIRECT = 'postgresql://postgres.testref:other@aws-0-us.pooler.supabase.com:5432/postgres';

const env = (overrides: Record<string, string | undefined> = {}) => ({
  TEST_MODE: 'true',
  DATABASE_URL: TEST,
  DIRECT_URL: TEST_DIRECT,
  ...overrides,
});

describe('databaseIdentity', () => {
  it('uses the Supabase project ref and never includes the password', () => {
    expect(databaseIdentity(REAL)).toBe('supabase:realref');
    expect(databaseIdentity(REAL)).toBe(databaseIdentity(REAL_DIRECT));
    expect(databaseIdentity(TEST)).not.toContain('other');
  });

  it('falls back to host, port and database for a plain Postgres', () => {
    expect(databaseIdentity('postgresql://u:p@localhost:5433/crezia_test')).toBe('localhost:5433/crezia_test');
  });
});

describe('assertTestDatabase', () => {
  it('accepts a test database different from the real one', () => {
    expect(() => assertTestDatabase(env(), [REAL, REAL_DIRECT])).not.toThrow();
  });

  it('refuses without TEST_MODE=true', () => {
    expect(() => assertTestDatabase(env({ TEST_MODE: undefined }), [REAL])).toThrow(TestDbGuardError);
  });

  it.each(['DATABASE_URL', 'DIRECT_URL'])('refuses when %s is missing (the CLI would fall back to .env)', (name) => {
    expect(() => assertTestDatabase(env({ [name]: undefined }), [REAL])).toThrow(new RegExp(name));
  });

  it('refuses when either URL points to the real project', () => {
    expect(() => assertTestDatabase(env({ DATABASE_URL: REAL }), [REAL, REAL_DIRECT])).toThrow(/misma base/);
    expect(() => assertTestDatabase(env({ DIRECT_URL: REAL_DIRECT }), [REAL, REAL_DIRECT])).toThrow(/misma base/);
  });

  it('does not leak any password in its messages', () => {
    try {
      assertTestDatabase(env({ DATABASE_URL: REAL }), [REAL]);
    } catch (error) {
      expect((error as Error).message).not.toMatch(/secret|other/);
    }
  });
});

describe('assertApiTestRun', () => {
  it('also requires the explicit confirmation flag', () => {
    expect(() => assertApiTestRun(env(), [REAL])).toThrow(/E2E_TEST_DB_CONFIRMED/);
    expect(() => assertApiTestRun(env({ E2E_TEST_DB_CONFIRMED: 'true' }), [REAL])).not.toThrow();
  });
});
