// Hard-deletes, ONLY in the test database, the rows of the front E2E tests that are already soft-deleted (names starting with
// "E2E "): movements, goals, bank accounts and categories. Users (the seed user included) are never touched.
// Run from the repo root with `npm run db:test:purge-e2e` (it runs db:test:check first and loads .env.test):
//   $env:E2E_TEST_DB_CONFIRMED = "true"
//   npm run db:test:purge-e2e -- --dry-run     # only counts
//   npm run db:test:purge-e2e                  # deletes
// The guard (purgeE2eSoftDeletedRows -> assertApiTestRun) refuses anything that is not the test database.
import { purgeE2eSoftDeletedRows } from '../utils/testDb';

const dryRun = process.argv.includes('--dry-run');

purgeE2eSoftDeletedRows(dryRun)
  .then((counts) => {
    console.log(dryRun ? 'Simulacro (no se borró nada). Filas E2E ya borradas que se purgarían:' : 'Filas E2E purgadas (borrado definitivo):');
    console.log(`  movimientos: ${counts.movements}`);
    console.log(`  metas:       ${counts.goals}`);
    console.log(`  cuentas:     ${counts.bankAccounts}`);
    console.log(`  categorías:  ${counts.categories}`);
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
