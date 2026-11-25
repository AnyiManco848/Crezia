// Deletes the users the registration E2E tests created (email @e2e.crezia.test AND document id E2E...).
// The API has no endpoint to delete users, so the front E2E (frontend/e2e/register.spec.ts) runs this script when it
// finishes. It only works against the TEST database: deleteE2eUsers runs the guard (TEST_MODE, a database that is not
// the real one, and E2E_TEST_DB_CONFIRMED=true). Run by hand from the repo root:
//   $env:E2E_TEST_DB_CONFIRMED = "true"
//   node --env-file=.env.test node_modules/tsx/dist/cli.mjs scripts/test-db-clean-e2e-users.ts
import { deleteE2eUsers } from '../utils/testDb';

deleteE2eUsers()
  .then((count) => console.log(`Usuarios E2E borrados: ${count}`))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
