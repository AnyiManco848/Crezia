import { expect, test } from '@playwright/test';
import { assertApiTestRun } from '../../../src/config/testDbGuard';
import { registerPayload } from '../../../data/registration';
import { login, register } from '../../../services/auth.service';
import { E2E_LOGIN_DOCUMENT_PREFIX, deleteE2eLoginUsers, softDeleteE2eLoginUser } from '../../../utils/testDb';

const INVALID_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos';

// These tests CREATE (and soft-delete) users on the TEST database only. Their users use the E2L document prefix, so the
// registration tests' cleanup does not remove them while files run in parallel.
test.describe('Auth API - POST /api/auth/login (security)', () => {
  test.beforeAll(async () => {
    assertApiTestRun();
    await deleteE2eLoginUsers();
  });

  test.afterAll(async () => {
    await deleteE2eLoginUsers();
  });

  const newUser = () => {
    const base = registerPayload();
    return { ...base, documentId: `${E2E_LOGIN_DOCUMENT_PREFIX}${(base.documentId as string).slice(3)}` };
  };

  /** D-4: the email is normalized like in the registration (trim + lowercase) */
  test('logs in with the email in uppercase and with surrounding spaces', async ({ request }) => {
    const payload = newUser();
    expect((await register(request, payload)).status()).toBe(201);

    for (const email of [(payload.email as string).toUpperCase(), `  ${payload.email}  `, `  ${(payload.email as string).toUpperCase()} `]) {
      const response = await login(request, { email, password: payload.password });
      const body = await response.json();

      expect(response.status(), email).toBe(200);
      expect(body.user.email).toBe(payload.email);
      expect(body.token.split('.')).toHaveLength(3);
    }
  });

  /** A wrong password is still refused when the email is written in uppercase */
  test('keeps refusing a wrong password with the email in uppercase', async ({ request }) => {
    const payload = newUser();
    await register(request, payload);

    const response = await login(request, { email: (payload.email as string).toUpperCase(), password: 'Otra1234' });

    expect(response.status()).toBe(401);
    expect((await response.json()).error.message).toBe(INVALID_CREDENTIALS_MESSAGE);
  });

  /** A user with deleted_at cannot log in and gets the same generic message as a wrong password */
  test('refuses a soft-deleted user with the generic credentials message', async ({ request }) => {
    const payload = newUser();
    expect((await register(request, payload)).status()).toBe(201);
    expect((await login(request, payload)).status()).toBe(200);

    expect(await softDeleteE2eLoginUser(payload.email as string)).toBe(1);

    const deleted = await login(request, { email: payload.email, password: payload.password });
    const wrongPassword = await login(request, { email: 'test@crezia.com', password: 'Otra1234*' });

    expect(deleted.status()).toBe(401);
    expect(await deleted.json()).toEqual(await wrongPassword.json());
    expect((await deleted.json()).error.message).toBe(INVALID_CREDENTIALS_MESSAGE);
  });
});
