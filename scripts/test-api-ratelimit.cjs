// Runs ONLY the registration rate-limit API test (AC-12), against the LOCAL TEST database, with a low limit.
//   $env:E2E_TEST_DB_CONFIRMED = "true"
//   npm run test:api:ratelimit
//
// Why a separate command: the normal run (npm run test:api:test) keeps the limit high (REGISTER_RATE_LIMIT_MAX=1000 in
// .env.test) so the rest of the suite can register users freely, and the rate-limit test skips itself unless
// E2E_REGISTER_RATE_LIMIT_MAX says which limit the backend was started with. Here both are set to the same low value,
// only for this process and the backend it starts: .env.test is not modified and the normal run is not affected.
// Node's --env-file never overrides a variable that is already set, which is what makes the low value win.
//
// It does NOT set E2E_TEST_DB_CONFIRMED for you: that confirmation is yours (the test-database guard refuses to run
// without it). Optional: RATE_LIMIT_TEST_MAX=3 to choose another low limit (default 5).
const { spawnSync } = require('node:child_process');

const limit = process.env.RATE_LIMIT_TEST_MAX ?? '5';
if (!/^[1-9]\d{0,2}$/.test(limit) || Number(limit) > 100) {
  console.error('RATE_LIMIT_TEST_MAX debe ser un entero entre 1 y 100 (es un límite BAJO a propósito).');
  process.exit(1);
}

const env = { ...process.env, REGISTER_RATE_LIMIT_MAX: limit, E2E_REGISTER_RATE_LIMIT_MAX: limit };

function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// 1) The guard: refuses to continue unless the database is not the real one (same check as test:api:test).
run(['--env-file=.env.test', 'node_modules/tsx/dist/cli.mjs', 'scripts/test-db-check.ts']);

// 2) Only the rate-limit test. Arguments are passed as an array (no shell), so the text keeps its spaces.
console.log(`Límite del registro para esta ejecución: ${limit} intentos.`);
run([
  '--env-file=.env.test',
  'node_modules/@playwright/test/cli.js',
  'test',
  'tests/api/auth/register.spec.ts',
  '--grep',
  'register rate limit',
]);
