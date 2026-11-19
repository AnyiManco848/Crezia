import { expect, login, test } from './support';

// Runs against the TEST database (see README). These tests CREATE, EDIT and DELETE movements of the seeded
// user. Every movement they create has a unique description and is deleted at the end of the test, even if
// an assertion fails.
const unique = () => `E2E movimiento ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

test.describe('Movimientos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/panel$/);
    await page.getByRole('link', { name: 'Movimientos' }).first().click();
    await expect(page).toHaveURL(/\/movimientos$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Movimientos' })).toBeVisible();
  });

  test('muestra la lista o el estado vacío, y los filtros', async ({ page }) => {
    const table = page.getByRole('table', { name: 'Movimientos' });
    const empty = page.getByRole('heading', { name: 'Aún no tienes movimientos' });
    await expect(table.or(empty)).toBeVisible();
    await expect(page.getByRole('form', { name: 'Filtros de movimientos' })).toBeVisible();
  });

  test('pide la lista con page y limit y lee el total del cuerpo', async ({ page }) => {
    const request = await page.waitForRequest((req) => req.url().includes('/api/movements?'));
    const url = new URL(request.url());

    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('limit')).toBe('20');
    await expect(page.getByText(/Mostrando \d+–\d+ de \d+/)).toBeVisible();
  });

  test('un rango de fechas invertido muestra el error y no pide nada', async ({ page }) => {
    await expect(page.getByRole('form', { name: 'Filtros de movimientos' })).toBeVisible();
    await page.getByLabel('Hasta').fill('2026-11-01');
    let calls = 0;
    page.on('request', (req) => req.url().includes('/api/movements?') && (calls += 1));

    await page.getByLabel('Desde').fill('2026-11-10');

    await expect(page.getByText('La fecha "Desde" no puede ser posterior a "Hasta"')).toBeVisible();
    expect(calls).toBe(0);
  });

  test('crear, editar y eliminar un movimiento', async ({ page }) => {
    const description = unique();
    const edited = `${description} (editado)`;

    try {
      // Create
      await page.getByRole('button', { name: 'Nuevo movimiento' }).first().click();
      const form = page.getByRole('dialog', { name: 'Nuevo movimiento' });
      await form.getByLabel('Monto').fill('12345,5');
      await form.getByLabel('Categoría').selectOption({ index: 1 }); // the first real category
      await form.getByLabel('Descripción (opcional)').fill(description);
      await form.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Movimiento guardado')).toBeVisible();
      await expect(page.getByText(description)).toBeVisible();

      // Edit
      await page.getByRole('button', { name: `Editar ${description}` }).click();
      const editForm = page.getByRole('dialog', { name: 'Editar movimiento' });
      await expect(editForm.getByLabel('Monto')).toHaveValue('12345,5');
      await editForm.getByLabel('Descripción (opcional)').fill(edited);
      await editForm.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Movimiento actualizado')).toBeVisible();
      await expect(page.getByText(edited)).toBeVisible();
    } finally {
      // Delete (also the cleanup)
      const row = page.getByRole('button', { name: new RegExp(`Eliminar ${description}`) });
      if (await row.count()) {
        await row.click();
        await page.getByRole('dialog', { name: 'Eliminar movimiento' }).getByRole('button', { name: 'Eliminar' }).click();
        await expect(page.getByText('Movimiento eliminado')).toBeVisible();
      }
    }
    await expect(page.getByText(description)).toHaveCount(0);
  });

  test('el formulario valida antes de enviar', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo movimiento' }).first().click();
    const form = page.getByRole('dialog', { name: 'Nuevo movimiento' });
    await form.getByLabel('Monto').waitFor();

    await form.getByRole('button', { name: 'Guardar' }).click();

    await expect(form.getByText('El monto es obligatorio')).toBeVisible();
    await expect(form.getByLabel('Monto')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(form).toBeHidden();
  });
});
