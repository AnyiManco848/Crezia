import 'dotenv/config';
import { configureThreadpool } from './config/threadpool';
import { createApp } from './app';
import { guardPerfMode, PerfGuardError } from './config/perfGuard';
import { assertTestDatabase, TestDbGuardError } from './config/testDbGuard';
import { createContainer } from './infrastructure/container';

// Before the first bcrypt call (see config/threadpool.ts).
configureThreadpool();

// Only acts when PERF_MODE=true (npm run dev:perf).
try {
  guardPerfMode();
} catch (err) {
  if (!(err instanceof PerfGuardError)) throw err;
  console.error(err.message);
  process.exit(1);
}

// Only acts when TEST_MODE=true (npm run dev:test): refuses a database equal to the real one.
if (process.env.TEST_MODE === 'true') {
  try {
    assertTestDatabase();
  } catch (err) {
    if (!(err instanceof TestDbGuardError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}

const port = Number(process.env.PORT ?? 3000);

createApp(createContainer()).listen(port, () => {
  console.log(`Crezia API listening on http://localhost:${port}`);
});
