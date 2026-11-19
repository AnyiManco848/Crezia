// Checks that the environment points to the TEST database and not to the real one.
// Run before migrating or seeding it: `npm run db:test:migrate` and `npm run db:test:seed` call it first.
import { assertTestDatabase, TestDbGuardError } from '../src/config/testDbGuard';

try {
  assertTestDatabase();
  console.log('Base de pruebas verificada: no coincide con la base real del .env.');
} catch (err) {
  if (!(err instanceof TestDbGuardError)) throw err;
  console.error(err.message);
  process.exit(1);
}
