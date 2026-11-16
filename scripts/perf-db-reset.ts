// Recreates the local perf database from the migrations and fills it.
// Run it with `npm run db:perf:reset`, which loads .env.perf before anything else.
import { spawnSync } from 'node:child_process';
import { PerfGuardError, requirePerfMode } from '../src/config/perfGuard';

try {
  requirePerfMode();
} catch (err) {
  if (!(err instanceof PerfGuardError)) throw err;
  console.error(err.message);
  process.exit(1);
}

// Children inherit process.env, so the Prisma CLI and the seeds see the .env.perf URLs
// (dotenv/config in prisma.config.ts never overrides a variable that is already set).
function run(label: string, command: string): void {
  console.log(`\n> ${label}: ${command}`);
  const result = spawnSync(command, { stdio: 'inherit', shell: true, env: process.env });
  if (result.status !== 0) {
    console.error(`Falló el paso "${label}". Se detiene el reset.`);
    process.exit(result.status ?? 1);
  }
}

run('Recrear la BD con las migraciones', 'npx prisma migrate reset --force');
run('Seed base (monedas, categorías, test@crezia.com)', 'npx prisma db seed');
run('Seed de volumen', 'npx tsx prisma/seed.perf.ts');
console.log('\nBD de performance lista.');
