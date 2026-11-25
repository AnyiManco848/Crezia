import { expect, login, test } from './support';

// Runs against the TEST database (see README). These tests CREATE, EDIT and DELETE goals (and one category) of the
// seeded user. Names are unique and everything is deleted at the end of the test, even if an assertion fails.
const unique = (prefix: string) => `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// A goal needs its own category (one active goal per category), so the test creates and removes a category too.
test.describe('Metas', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/panel$/);
  });

  test('muestra la tabla o el estado vacío', async ({ page }) => {
    await page.getByRole('link', { name: 'Metas' }).first().click();
    await expect(page).toHaveURL(/\/metas$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Metas' })).toBeVisible();

    const table = page.getByRole('table', { name: 'Metas de ahorro' });
    const empty = page.getByRole('heading', { name: 'Aún no tienes metas' });
    await expect(table.or(empty)).toBeVisible();
  });

  test('pide la lista con page y limit y lee el total de las cabeceras', async ({ page }) => {
    const responsePromise = page.waitForResponse((res) => res.url().includes('/api/goals?'));
    await page.getByRole('link', { name: 'Metas' }).first().click();
    const response = await responsePromise;
    const url = new URL(response.url());

    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(Number(response.headers()['x-total-count'])).toBeGreaterThanOrEqual(0);
  });

  test('valida el formulario antes de enviar', async ({ page }) => {
    await page.getByRole('link', { name: 'Metas' }).first().click();
    await page.getByRole('button', { name: 'Nueva meta' }).first().click();
    const form = page.getByRole('dialog', { name: 'Nueva meta' });
    await form.getByRole('button', { name: 'Guardar' }).click();

    await expect(form.getByText('El nombre es obligatorio')).toBeVisible();
    // The placeholder <option> has the same text as the error, so look only at the alert.
    await expect(form.getByRole('alert').filter({ hasText: 'Selecciona una categoría' })).toBeVisible();
    await expect(form.getByText('El monto es obligatorio')).toBeVisible();
    await expect(form.getByText('La fecha fin es obligatoria')).toBeVisible();
  });

  test('crear, editar y eliminar una meta con su categoría', async ({ page }) => {
    const categoryName = unique('E2E cat meta');
    const goalName = unique('E2E meta');
    let goalCreated = false;
    let categoryCreated = false;

    try {
      // 1. A fresh category, so the "one active goal per category" rule cannot collide with existing data.
      await page.getByRole('link', { name: 'Categorías' }).first().click();
      await page.getByRole('button', { name: 'Nueva categoría' }).first().click();
      const categoryForm = page.getByRole('dialog', { name: 'Nueva categoría' });
      await categoryForm.getByLabel('Nombre').fill(categoryName);
      await categoryForm.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Categoría creada')).toBeVisible();
      categoryCreated = true;

      // 2. Create the goal.
      await page.getByRole('link', { name: 'Metas' }).first().click();
      await page.getByRole('button', { name: 'Nueva meta' }).first().click();
      const form = page.getByRole('dialog', { name: 'Nueva meta' });
      await form.getByLabel('Nombre').fill(goalName);
      await form.getByLabel('Categoría').selectOption({ label: categoryName });
      await form.getByLabel('Monto objetivo').fill('500000');
      await form.getByLabel('Fecha de fin').fill('2099-12-31');
      await form.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Meta creada')).toBeVisible();
      goalCreated = true;

      const row = page.getByRole('row').filter({ hasText: goalName });
      await expect(row).toBeVisible();
      await expect(row.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
      await expect(row).toContainText('Aún no hay gastos en esta categoría');

      // 3. Edit it.
      await page.getByRole('button', { name: `Editar ${goalName}` }).click();
      const editForm = page.getByRole('dialog', { name: 'Editar meta' });
      await expect(editForm.getByLabel('Nombre')).toHaveValue(goalName);
      await editForm.getByLabel('Monto objetivo').fill('750000');
      await editForm.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Meta actualizada')).toBeVisible();
      await expect(page.getByRole('row').filter({ hasText: goalName })).toContainText('750.000');

      // 4. Delete it.
      await page.getByRole('button', { name: `Eliminar ${goalName}` }).click();
      await page.getByRole('dialog', { name: 'Eliminar meta' }).getByRole('button', { name: 'Eliminar' }).click();
      await expect(page.getByText('Meta eliminada')).toBeVisible();
      await expect(page.getByRole('row').filter({ hasText: goalName })).toHaveCount(0);
      goalCreated = false;
    } finally {
      // Cleanup when the test failed halfway.
      if (goalCreated) {
        await page.goto('/metas');
        const button = page.getByRole('button', { name: `Eliminar ${goalName}` });
        if (await button.count()) {
          await button.click();
          await page.getByRole('dialog', { name: 'Eliminar meta' }).getByRole('button', { name: 'Eliminar' }).click();
          await expect(page.getByText('Meta eliminada')).toBeVisible();
        }
      }
      if (categoryCreated) {
        await page.goto('/categorias');
        const button = page.getByRole('button', { name: `Eliminar ${categoryName}` });
        if (await button.count()) {
          await button.click();
          await page.getByRole('dialog', { name: 'Eliminar categoría' }).getByRole('button', { name: 'Eliminar' }).click();
          await expect(page.getByText('Categoría eliminada')).toBeVisible();
        }
      }
    }
  });
});
