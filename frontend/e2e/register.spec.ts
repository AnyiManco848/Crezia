import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { E2E, expect, login, test } from './support';

// Runs against the TEST database (see README and docs/generated/test-database.md). These tests CREATE users.
// Every user has an email ending in @e2e.crezia.test and a document id starting with E2E, and they are deleted when the
// file ends (and before it starts, for leftovers of an interrupted run) by scripts/test-db-clean-e2e-users.ts, which
// runs the test-database guard first. The API has no endpoint to delete users.
//
// The 429 case is NOT here: the test backend runs with a high limit (REGISTER_RATE_LIMIT_MAX=1000) so these tests do
// not hit it. The API suite has it (tests/api/auth/register.spec.ts) and the screen is covered by Vitest.

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const GENERIC_CONFLICT = 'No pudimos crear la cuenta con esos datos. Revisa la información o inicia sesión si ya tienes una cuenta.';

function cleanE2eUsers() {
  // The script loads .env.test itself (the guard refuses anything that is not the test database).
  execFileSync(process.execPath, ['--env-file=.env.test', 'node_modules/tsx/dist/cli.mjs', 'scripts/test-db-clean-e2e-users.ts'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: process.env,
  });
}

function newUser() {
  const suffix = randomBytes(5).toString('hex');
  return {
    name: 'E2E Registro Front',
    documentId: `E2E${suffix}`,
    birthDate: '1995-03-10',
    email: `reg-front-${suffix}@e2e.crezia.test`,
    password: 'Clave1234',
  };
}

type NewUser = ReturnType<typeof newUser>;

async function fillRegisterForm(page: import('@playwright/test').Page, user: NewUser) {
  await page.getByLabel('Nombre completo').fill(user.name);
  await page.getByLabel('Identificación (cédula)').fill(user.documentId);
  await page.getByLabel('Fecha de nacimiento').fill(user.birthDate);
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(user.password);
  await page.getByLabel('Confirmar contraseña').fill(user.password);
}

test.describe('Registro', () => {
  test.beforeAll(() => {
    if (process.env.E2E_TEST_DB_CONFIRMED === 'true') cleanE2eUsers();
  });

  test.afterAll(() => {
    if (process.env.E2E_TEST_DB_CONFIRMED === 'true') cleanE2eUsers();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/registro');
    await expect(page.getByRole('heading', { level: 1, name: 'Crea tu cuenta' })).toBeVisible();
  });

  test('valida en el navegador y no envía nada si faltan datos', async ({ page }) => {
    const sent: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/auth/register')) sent.push(request.url());
    });

    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('El nombre debe tener al menos 2 caracteres')).toBeVisible();
    await expect(page.getByText('El correo no es válido')).toBeVisible();
    await expect(page.getByText('La contraseña debe tener al menos 8 caracteres')).toBeVisible();
    await expect(page.getByText('Confirma tu contraseña')).toBeVisible();
    await expect(page.getByLabel('Nombre completo')).toBeFocused();
    expect(sent).toHaveLength(0);
  });

  test('las contraseñas distintas se avisan antes de enviar', async ({ page }) => {
    const user = newUser();
    await fillRegisterForm(page, user);
    await page.getByLabel('Confirmar contraseña').fill('Otra12345');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();
  });

  test('muestra y oculta la contraseña y marca los requisitos', async ({ page }) => {
    const password = page.getByLabel('Contraseña', { exact: true });
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(password).toHaveAttribute('type', 'text');

    await password.fill('abcdefgh1');
    const requirements = page.getByRole('list', { name: 'Requisitos de la contraseña' });
    await expect(requirements).toContainText('Al menos 8 caracteres (cumplido)');
    await expect(requirements).toContainText('Una letra (cumplido)');
    await expect(requirements).toContainText('Un número (cumplido)');
  });

  test('enlaza el registro con el inicio de sesión y al revés', async ({ page }) => {
    await page.getByRole('link', { name: 'Inicia sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole('link', { name: 'Registrarse' }).click();
    await expect(page).toHaveURL(/\/registro$/);
  });

  test('crea la cuenta, guarda la sesión y lleva al Panel', async ({ page }) => {
    const user = newUser();
    await fillRegisterForm(page, user);
    await page.getByLabel('Teléfono celular (opcional)').fill('300 123 4567');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Panel' })).toBeVisible();
    const stored = await page.evaluate(() => window.sessionStorage.getItem('crezia-session'));
    const session = JSON.parse(stored ?? '{}') as { token?: string; user?: { email?: string; role?: string } };
    expect(session.token).toBeTruthy();
    expect(session.user?.email).toBe(user.email);
    expect(session.user?.role).toBe('User');
  });

  test('con la sesión iniciada /registro lleva al Panel', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/panel$/);

    await page.goto('/registro');

    await expect(page).toHaveURL(/\/panel$/);
  });

  test('un correo o una identificación repetidos dan el mismo mensaje genérico', async ({ page, request }) => {
    const existing = newUser();
    const created = await request.post(`${E2E.apiUrl}/api/auth/register`, {
      data: { ...existing, phone: null },
    });
    expect(created.status()).toBe(201);

    // Same email, another identification
    await fillRegisterForm(page, { ...newUser(), email: existing.email });
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    const banner = page.getByRole('alert').filter({ hasText: GENERIC_CONFLICT });
    await expect(banner).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).not.toHaveAttribute('aria-invalid', 'true');

    // Same identification, another email: the very same text
    await page.getByLabel('Identificación (cédula)').fill(existing.documentId);
    await page.getByLabel('Correo electrónico').fill(newUser().email);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('alert').filter({ hasText: GENERIC_CONFLICT })).toBeVisible();
    await expect(page).toHaveURL(/\/registro$/);
  });
});
