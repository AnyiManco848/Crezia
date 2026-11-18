import { expect, login, test } from './support';

test.describe('Login y sesión', () => {
  test('sin sesión, una ruta protegida lleva al login', async ({ page }) => {
    await page.goto('/panel');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  });

  test('con contraseña incorrecta muestra el mensaje del backend y no entra', async ({ page }) => {
    await login(page, undefined, 'contraseña-incorrecta');

    await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('con datos válidos abre el Panel con el nombre real y cierra sesión', async ({ page }) => {
    await login(page);

    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Panel' })).toBeVisible();
    // The menu button shows the real name and initials (from the login response).
    const menuButton = page.getByRole('button', { name: /Menú de cuenta/ }).first();
    await expect(menuButton).toBeVisible();

    // The token is in sessionStorage only.
    const storage = await page.evaluate(() => ({
      session: sessionStorage.getItem('crezia-session') !== null,
      localKeys: Object.keys(localStorage),
    }));
    expect(storage.session).toBe(true);
    expect(storage.localKeys).not.toContain('crezia-session');

    // The session survives a reload.
    await page.reload();
    await expect(page).toHaveURL(/\/panel$/);

    await menuButton.click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => sessionStorage.getItem('crezia-session'))).toBeNull();
  });
});

test.describe('Tema', () => {
  test('la elección se guarda en crezia-theme y se aplica antes de pintar', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('radio', { name: 'Oscuro' }).check({ force: true });

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('crezia-theme'))).toBe('dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('radio', { name: 'Sistema' }).check({ force: true });
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    expect(await page.evaluate(() => localStorage.getItem('crezia-theme'))).toBeNull();
  });
});
