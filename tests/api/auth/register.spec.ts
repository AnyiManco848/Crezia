import { expect, test } from '@playwright/test';
import { assertApiTestRun } from '../../../src/config/testDbGuard';
import { birthDateForAge, registerPayload } from '../../../data/registration';
import { login, register } from '../../../services/auth.service';
import { deleteE2eUsers, findUserByEmail } from '../../../utils/testDb';

const GENERIC_CONFLICT =
  'No pudimos crear la cuenta con esos datos. Revisa la información o inicia sesión si ya tienes una cuenta.';

// These tests CREATE users. They only run against the TEST database: `npm run test:api:test` loads .env.test,
// starts the backend on it and checks the guard. Never run them with the real .env.
test.describe('Auth API - POST /api/auth/register (AUTH-REG-001)', () => {
  test.beforeAll(async () => {
    assertApiTestRun(); // throws (and the whole file fails) if the environment is not the test one
    await deleteE2eUsers(); // leftovers of an interrupted run
  });

  test.afterAll(async () => {
    await deleteE2eUsers();
  });

  /** AC-1, AC-2, AC-3: creates the account, hashes the password, role User, COP, no financial profile */
  test('creates the account and stores a bcrypt hash, role User, COP and no financial profile', async ({ request }) => {
    const payload = registerPayload();

    const response = await register(request, payload);
    const body = await response.json();

    expect(response.status()).toBe(201);
    expect(body.token.split('.')).toHaveLength(3);
    expect(body.user).toMatchObject({
      email: payload.email,
      documentId: payload.documentId,
      role: 'User',
      preferredCurrencyCode: 'COP',
    });
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|password_hash|\$2[aby]\$/);

    const stored = await findUserByEmail(payload.email as string);
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(stored?.passwordHash).not.toContain(payload.password as string);
    expect(stored?.role).toBe('User');
    expect(stored?.financialProfile).toBeNull();
  });

  /** AC-4: the returned token works and the person can log in right away */
  test('the returned token is valid and the new user can log in', async ({ request }) => {
    const payload = registerPayload();
    const created = await (await register(request, payload)).json();

    const me = await request.get('/api/movements/summary?from=2026-01-01&to=2026-12-31', {
      headers: { Authorization: `Bearer ${created.token}` },
    });
    const session = await login(request, { email: payload.email, password: payload.password });

    expect(me.status()).toBe(200);
    expect(session.status()).toBe(200);
  });

  /** AC-6 (D-4): the email is stored in lowercase */
  test('stores the email in lowercase', async ({ request }) => {
    const base = registerPayload();
    const mixed = (base.email as string).replace('reg-', 'Reg-').toUpperCase().replace('@E2E.CREZIA.TEST', '@e2e.crezia.test');

    const response = await register(request, { ...base, email: mixed });

    expect(response.status()).toBe(201);
    expect((await response.json()).user.email).toBe(mixed.toLowerCase());
  });

  /** AC-5: a chosen active currency is kept */
  test('keeps a chosen active currency and rejects an unknown one', async ({ request }) => {
    const usd = await register(request, registerPayload({ preferredCurrencyCode: 'USD' }));
    const unknown = await register(request, registerPayload({ preferredCurrencyCode: 'ZZZ' }));

    expect(usd.status()).toBe(201);
    expect((await usd.json()).user.preferredCurrencyCode).toBe('USD');
    expect(unknown.status()).toBe(400);
  });

  /** AC-7, AC-8: duplicates answer the SAME generic 409, and a repeated attempt creates nothing */
  test('answers the same generic 409 for a repeated email and a repeated document id', async ({ request }) => {
    const first = registerPayload();
    expect((await register(request, first)).status()).toBe(201);

    const sameEmail = await register(request, registerPayload({ email: first.email }));
    const sameDocument = await register(request, registerPayload({ documentId: first.documentId }));
    const both = await register(request, first);

    for (const response of [sameEmail, sameDocument, both]) {
      expect(response.status()).toBe(409);
      expect(await response.json()).toEqual({ error: { code: 'CONFLICT', message: GENERIC_CONFLICT } });
    }
  });

  test('treats an email that differs only by case as repeated', async ({ request }) => {
    const first = registerPayload();
    expect((await register(request, first)).status()).toBe(201);

    const response = await register(request, registerPayload({ email: (first.email as string).toUpperCase() }));

    expect(response.status()).toBe(409);
  });

  /** AC-9: under 18 is rejected, exactly 18 today is accepted */
  test('rejects a person under 18 and accepts one who turns 18 today', async ({ request }) => {
    const minor = await register(request, registerPayload({ birthDate: birthDateForAge(18, 1) }));
    const adult = await register(request, registerPayload({ birthDate: birthDateForAge(18, 0) }));

    expect(minor.status()).toBe(400);
    expect(JSON.stringify(await minor.json())).toContain('Debes tener 18 años o más');
    expect(adult.status()).toBe(201);
  });

  /** AC-10: validation answers 400 in Spanish, per field */
  test('answers 400 with Spanish messages per field', async ({ request }) => {
    const response = await register(request, registerPayload({ email: 'no-es-correo', password: '123', name: '' }));
    const body = await response.json();

    expect(response.status()).toBe(400);
    const paths = body.error.details.map((detail: { path: string }) => detail.path);
    expect(paths).toEqual(expect.arrayContaining(['body.email', 'body.password', 'body.name']));
    expect(JSON.stringify(body)).toContain('El correo no es válido');
  });

  test('requires a password with a letter and a number, within 8 to 72 bytes', async ({ request }) => {
    for (const password of ['SoloLetras', '12345678', 'Ab1', `${'a'.repeat(72)}1`]) {
      expect((await register(request, registerPayload({ password }))).status(), password.slice(0, 12)).toBe(400);
    }
  });

  /** AC-11: mass assignment — role and other internal fields in the body are ignored */
  test('ignores role and other internal fields sent in the body', async ({ request }) => {
    const payload = registerPayload({ role: 'Admin', id: '00000000-0000-4000-8000-000000000000', deletedAt: '2020-01-01' });

    const response = await register(request, payload);
    const body = await response.json();

    expect(response.status()).toBe(201);
    expect(body.user.role).toBe('User');
    expect(body.user.id).not.toBe(payload.id);
    expect((await findUserByEmail(payload.email as string))?.deletedAt).toBeNull();
  });

  test('does not accept a missing body', async ({ request }) => {
    const response = await request.post('/api/auth/register', { data: {} });

    expect(response.status()).toBe(400);
  });
});

// AC-12: the rate limit. The main run raises the limit (REGISTER_RATE_LIMIT_MAX in .env.test), so this test only
// runs on demand, ALONE, against a backend started with a low limit. See docs/generated/test-database.md.
test.describe('Auth API - POST /api/auth/register rate limit', () => {
  const limit = Number(process.env.E2E_REGISTER_RATE_LIMIT_MAX);
  test.skip(!limit, 'Set E2E_REGISTER_RATE_LIMIT_MAX to the limit the backend was started with (e.g. 5).');

  test('answers 429 with Retry-After once the limit is exceeded, even for invalid attempts', async ({ request }) => {
    assertApiTestRun();
    let blocked = null;
    for (let attempt = 0; attempt <= limit; attempt += 1) {
      const response = await register(request, {}); // invalid on purpose: cheap, and counted all the same
      if (response.status() === 429) {
        blocked = response;
        break;
      }
      expect(response.status()).toBe(400);
    }

    expect(blocked, 'The limit was never reached').not.toBeNull();
    expect(Number(blocked!.headers()['retry-after'])).toBeGreaterThan(0);
    expect((await blocked!.json()).error.code).toBe('TOO_MANY_REQUESTS');
  });
});
