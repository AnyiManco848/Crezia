import 'dotenv/config';
import { configureThreadpool } from './config/threadpool';
import { createApp } from './app';
import { guardPerfMode, PerfGuardError } from './config/perfGuard';
import { assertProductionEnv, ProductionGuardError } from './config/productionGuard';
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

// Only acts when NODE_ENV=production: refuses TEST_MODE/PERF_MODE, a weak JWT_SECRET, a missing CORS_ORIGINS, etc.
try {
  for (const warning of assertProductionEnv()) console.warn(`Aviso: ${warning}`);
} catch (err) {
  if (!(err instanceof ProductionGuardError)) throw err;
  console.error(err.message);
  process.exit(1);
}

// PORT is set by the hosting platform (Railway); 3000 locally.
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`PORT no es válido: "${process.env.PORT}".`);
  process.exit(1);
}

createApp(createContainer()).listen(port, () => {
  console.log(`Crezia API listening on http://localhost:${port}`);
});
