import { expect, test } from '@playwright/test';
import { assertApiTestRun } from '../../../src/config/testDbGuard';
import { testUser } from '../../../data/users';
import { login } from '../../../services/auth.service';

// D-9: the login rate limit. The main run keeps the limit high (TEST_MODE), so this test only runs on demand, ALONE, against a
// backend started with a low LOGIN_RATE_LIMIT_MAX: `npm run test:api:ratelimit:login`. It never creates users.
test.describe('Auth API - POST /api/auth/login rate limit', () => {
  const limit = Number(process.env.E2E_LOGIN_RATE_LIMIT_MAX);
  test.skip(!limit, 'Set E2E_LOGIN_RATE_LIMIT_MAX to the limit the backend was started with (npm run test:api:ratelimit:login).');

  test('answers 429 with Retry-After and a Spanish message once the limit is exceeded, even for valid credentials', async ({ request }) => {
    assertApiTestRun();
    let blocked = null;
    for (let attempt = 0; attempt <= limit; attempt += 1) {
      const response = await login(request, {}); // invalid on purpose: cheap (no bcrypt), and counted all the same
      if (response.status() === 429) {
        blocked = response;
        break;
      }
      expect(response.status()).toBe(400);
    }

    expect(blocked, 'The limit was never reached').not.toBeNull();
    expect(Number(blocked!.headers()['retry-after'])).toBeGreaterThan(0);
    const body = await blocked!.json();
    expect(body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(body.error.message).toBe('Demasiados intentos. Inténtalo de nuevo en unos minutos.');

    // The block is per IP: even the right password is refused until the window ends.
    expect((await login(request, testUser)).status()).toBe(429);
  });
});
