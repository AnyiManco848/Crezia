// Runs ONLY the login rate-limit API test (D-9), against the LOCAL TEST database, with a low limit.
//   $env:E2E_TEST_DB_CONFIRMED = "true"
//   npm run test:api:ratelimit:login
//
// Same idea as scripts/test-api-ratelimit.cjs (registration): the normal run keeps the login limit high (TEST_MODE), and the
// 429 test skips itself unless E2E_LOGIN_RATE_LIMIT_MAX says which limit the backend was started with. Here both are set to the
// same low value, only for this process and the backend it starts: .env.test is not modified. Node's --env-file never overrides a
// variable that is already set, which is what makes the low value win.
//
// It does NOT set E2E_TEST_DB_CONFIRMED for you: that confirmation is yours. Optional: LOGIN_RATE_LIMIT_TEST_MAX=3 (default 5).
const { spawnSync } = require('node:child_process');

const limit = process.env.LOGIN_RATE_LIMIT_TEST_MAX ?? '5';
if (!/^[1-9]\d{0,2}$/.test(limit) || Number(limit) > 100) {
  console.error('LOGIN_RATE_LIMIT_TEST_MAX debe ser un entero entre 1 y 100 (es un límite BAJO a propósito).');
  process.exit(1);
}

const env = { ...process.env, LOGIN_RATE_LIMIT_MAX: limit, E2E_LOGIN_RATE_LIMIT_MAX: limit };

function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// 1) The guard: refuses to continue unless the database is not the real one.
run(['--env-file=.env.test', 'node_modules/tsx/dist/cli.mjs', 'scripts/test-db-check.ts']);

// 2) Only the login rate-limit test.
console.log(`Límite del login para esta ejecución: ${limit} intentos.`);
run([
  '--env-file=.env.test',
  'node_modules/@playwright/test/cli.js',
  'test',
  'tests/api/auth/login-ratelimit.spec.ts',
]);
