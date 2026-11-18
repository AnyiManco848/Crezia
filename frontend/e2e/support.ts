import { test as base, expect, type Page } from '@playwright/test';

// Safety switch: the E2E tests create and delete data, so they only run when you confirm that the backend
// at E2E_API_URL is connected to the TEST database (never the real one).
const confirmed = process.env.E2E_TEST_DB_CONFIRMED === 'true';

export const E2E = {
  apiUrl: process.env.E2E_API_URL ?? 'http://localhost:3000',
  email: process.env.E2E_EMAIL ?? '',
  password: process.env.E2E_PASSWORD ?? '',
};

export const test = base.extend({});

test.beforeEach(async ({ request }) => {
  test.skip(
    !confirmed || !E2E.email || !E2E.password,
    'Define E2E_TEST_DB_CONFIRMED=true, E2E_EMAIL y E2E_PASSWORD (usuario sembrado en la BD de pruebas). Ver README.',
  );
  const health = await request.get(`${E2E.apiUrl}/api/health`).catch(() => null);
  test.skip(!health?.ok(), `El backend de pruebas no responde en ${E2E.apiUrl}. Levántalo con .env.test (ver README).`);
});

export async function login(page: Page, email = E2E.email, password = E2E.password) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

export { expect };
