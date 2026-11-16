import { describe, expect, it } from 'vitest';
import { guardPerfMode, PerfGuardError, requirePerfMode } from '../../src/config/perfGuard';

const LOCAL_PERF = 'postgresql://postgres:secret@localhost:5432/crezia_perf';

describe('guardPerfMode', () => {
  it('does nothing when PERF_MODE is not true', () => {
    expect(() =>
      guardPerfMode({ DATABASE_URL: 'postgresql://u:p@aws-0-x.pooler.supabase.com:6543/postgres' }),
    ).not.toThrow();
  });

  it('accepts localhost and 127.0.0.1 with a database ending in _perf', () => {
    expect(() => guardPerfMode({ PERF_MODE: 'true', DATABASE_URL: LOCAL_PERF })).not.toThrow();
    expect(() =>
      guardPerfMode({ PERF_MODE: 'true', DATABASE_URL: 'postgresql://postgres:x@127.0.0.1/other_perf' }),
    ).not.toThrow();
  });

  it('rejects a non-local host', () => {
    expect(() =>
      guardPerfMode({ PERF_MODE: 'true', DATABASE_URL: 'postgresql://u:p@db.example.com:5432/crezia_perf' }),
    ).toThrow(/host "db.example.com"/);
  });

  it('rejects a database whose name does not end in _perf', () => {
    expect(() =>
      guardPerfMode({ PERF_MODE: 'true', DATABASE_URL: 'postgresql://postgres:x@localhost:5432/crezia' }),
    ).toThrow(/debe terminar en "_perf"/);
  });

  it('rejects a missing or invalid DATABASE_URL', () => {
    expect(() => guardPerfMode({ PERF_MODE: 'true' })).toThrow(PerfGuardError);
    expect(() => guardPerfMode({ PERF_MODE: 'true', DATABASE_URL: 'not a url' })).toThrow(PerfGuardError);
  });

  it('also checks DIRECT_URL when it is set', () => {
    expect(() =>
      guardPerfMode({
        PERF_MODE: 'true',
        DATABASE_URL: LOCAL_PERF,
        DIRECT_URL: 'postgresql://u:p@aws-0-x.pooler.supabase.com:5432/postgres',
      }),
    ).toThrow(/DIRECT_URL/);
  });
});

describe('requirePerfMode', () => {
  it('rejects when PERF_MODE is not true, even with a local perf database', () => {
    expect(() => requirePerfMode({ DATABASE_URL: LOCAL_PERF, DIRECT_URL: LOCAL_PERF })).toThrow(/PERF_MODE=true/);
  });

  it('requires DIRECT_URL, because the Prisma CLI would fall back to .env', () => {
    expect(() => requirePerfMode({ PERF_MODE: 'true', DATABASE_URL: LOCAL_PERF })).toThrow(/falta DIRECT_URL/);
  });

  it('accepts both URLs pointing to a local perf database', () => {
    expect(() =>
      requirePerfMode({ PERF_MODE: 'true', DATABASE_URL: LOCAL_PERF, DIRECT_URL: LOCAL_PERF }),
    ).not.toThrow();
  });
});
