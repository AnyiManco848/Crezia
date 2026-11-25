import { expect, login, test } from './support';

// Runs against the TEST database (see README). These tests CREATE, EDIT and DELETE categories of the seeded user.
// Every category they create has a unique name and is deleted at the end of the test, even if an assertion fails.
const unique = () => `E2E categoría ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

test.describe('Categorías', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/panel$/);
    await page.getByRole('link', { name: 'Categorías' }).first().click();
    await expect(page).toHaveURL(/\/categorias$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Categorías' })).toBeVisible();
  });

  test('muestra la tabla con las categorías del sistema, sin botones de edición', async ({ page }) => {
    await expect(page.getByRole('table', { name: 'Categorías' })).toBeVisible();
    const system = page.getByRole('row').filter({ hasText: 'Del sistema' }).first();
    await expect(system).toBeVisible();
    await expect(system.getByRole('button')).toHaveCount(0);
  });

  test('pide la lista con page y limit y lee el total de las cabeceras', async ({ page }) => {
    // beforeEach already loaded the page, so the list response may be gone: subscribe first, then reload.
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/categories?')),
      page.reload(),
    ]);
    const url = new URL(response.url());

    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(Number(response.headers()['x-total-count'])).toBeGreaterThanOrEqual(0);
    await expect(page.getByText(/Mostrando \d+–\d+ de \d+/)).toBeVisible();
  });

  test('el nombre es obligatorio', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva categoría' }).first().click();
    const form = page.getByRole('dialog', { name: 'Nueva categoría' });
    await form.getByRole('button', { name: 'Guardar' }).click();
    await expect(form.getByText('El nombre es obligatorio')).toBeVisible();
  });

  test('crear, editar y eliminar una categoría', async ({ page }) => {
    const name = unique();
    let currentName = name;

    try {
      await page.getByRole('button', { name: 'Nueva categoría' }).first().click();
      const form = page.getByRole('dialog', { name: 'Nueva categoría' });
      await form.getByLabel('Nombre').fill(name);
      await form.getByLabel('Descripción (opcional)').fill('Prueba');
      await form.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Categoría creada')).toBeVisible();
      await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();

      await page.getByRole('button', { name: `Editar ${name}` }).click();
      const editForm = page.getByRole('dialog', { name: 'Editar categoría' });
      await expect(editForm.getByLabel('Nombre')).toHaveValue(name);
      currentName = `${name} editada`;
      await editForm.getByLabel('Nombre').fill(currentName);
      await editForm.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Categoría actualizada')).toBeVisible();
      await expect(page.getByRole('cell', { name: currentName, exact: true })).toBeVisible();

      await page.getByRole('button', { name: `Eliminar ${currentName}` }).click();
      await page.getByRole('dialog', { name: 'Eliminar categoría' }).getByRole('button', { name: 'Eliminar' }).click();
      await expect(page.getByText('Categoría eliminada')).toBeVisible();
      await expect(page.getByRole('cell', { name: currentName })).toHaveCount(0);
      currentName = '';
    } finally {
      // Cleanup if the test failed halfway: delete whatever is left with the unique prefix.
      if (currentName) {
        const button = page.getByRole('button', { name: `Eliminar ${currentName}` });
        if (await button.count()) {
          await button.click();
          await page.getByRole('dialog', { name: 'Eliminar categoría' }).getByRole('button', { name: 'Eliminar' }).click();
        }
      }
    }
  });
});
