import 'dotenv/config';
import { configureThreadpool } from './config/threadpool';
import { createApp } from './app';
import { guardPerfMode, PerfGuardError } from './config/perfGuard';
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

const port = Number(process.env.PORT ?? 3000);

createApp(createContainer()).listen(port, () => {
  console.log(`Crezia API listening on http://localhost:${port}`);
});
