import { expect, login, test } from './support';

// Runs against the TEST database (see README). These tests CREATE, EDIT and DELETE accounts of the seeded user.
// Every account they create has a unique bank name and is deleted at the end of the test, even if an assertion fails.
const unique = () => `E2E banco ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

test.describe('Cuentas', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/panel$/);
    await page.getByRole('link', { name: 'Cuentas' }).first().click();
    await expect(page).toHaveURL(/\/cuentas$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Cuentas' })).toBeVisible();
  });

  test('muestra las tarjetas o el estado vacío', async ({ page }) => {
    const cards = page.getByRole('article').first();
    const empty = page.getByRole('heading', { name: 'Aún no tienes cuentas' });
    await expect(cards.or(empty)).toBeVisible();
  });

  test('pide la lista con page y limit y lee el total de las cabeceras', async ({ page }) => {
    const response = await page.waitForResponse((res) => res.url().includes('/api/bank-accounts?'));
    const url = new URL(response.url());

    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(Number(response.headers()['x-total-count'])).toBeGreaterThanOrEqual(0);
    await expect(page.getByText(/Mostrando \d+–\d+ de \d+/)).toBeVisible();
  });

  test('crear, editar y eliminar una cuenta', async ({ page }) => {
    const bank = unique();

    try {
      await page.getByRole('button', { name: 'Nueva cuenta' }).first().click();
      const form = page.getByRole('dialog', { name: 'Nueva cuenta' });
      await form.getByLabel('Banco').fill(bank);
      await form.getByLabel('Alias (opcional)').fill('Prueba');
      await form.getByLabel('Tipo de cuenta').selectOption('Checking');
      await form.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Cuenta creada')).toBeVisible();
      await expect(page.getByRole('heading', { name: bank })).toBeVisible();

      await page.getByRole('button', { name: `Editar ${bank}` }).click();
      const editForm = page.getByRole('dialog', { name: 'Editar cuenta' });
      await expect(editForm.getByLabel('Banco')).toHaveValue(bank);
      await editForm.getByLabel('Alias (opcional)').fill('Prueba editada');
      await editForm.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Cuenta actualizada')).toBeVisible();
      await expect(page.getByText('Prueba editada')).toBeVisible();
    } finally {
      const remove = page.getByRole('button', { name: `Eliminar ${bank}` });
      if (await remove.count()) {
        await remove.click();
        await page.getByRole('dialog', { name: 'Eliminar cuenta' }).getByRole('button', { name: 'Eliminar' }).click();
        await expect(page.getByText('Cuenta eliminada')).toBeVisible();
      }
    }
    await expect(page.getByRole('heading', { name: bank })).toHaveCount(0);
  });

  test('el formulario valida antes de enviar', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva cuenta' }).first().click();
    const form = page.getByRole('dialog', { name: 'Nueva cuenta' });

    await form.getByRole('button', { name: 'Guardar' }).click();

    await expect(form.getByText('El nombre del banco es obligatorio')).toBeVisible();
    await expect(form.getByLabel('Banco')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(form).toBeHidden();
  });
});
