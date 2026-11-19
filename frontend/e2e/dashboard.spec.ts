import type { Request } from '@playwright/test';
import { expect, login, test } from './support';

// Runs against the TEST database (see README). The seeded user has movements in the current month, but the
// assertions also hold for an empty period: they check the structure and the requests, not the amounts.
test.describe('Panel', () => {
  let summaryRequests: Request[];

  test.beforeEach(async ({ page }) => {
    summaryRequests = [];
    // Registered before the login so the first summary request is never missed.
    page.on('request', (request) => {
      if (request.url().includes('/api/movements/summary')) summaryRequests.push(request);
    });
    await login(page);
    await expect(page).toHaveURL(/\/panel$/);
  });

  test('es la pantalla inicial y muestra el mensaje del día, el periodo y el resumen o el estado vacío', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Panel' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Mensaje del día' })).toBeVisible();
    await expect(page.getByLabel('Periodo')).toHaveValue('thisMonth');

    const kpis = page.getByRole('heading', { level: 2, name: 'Ingresos', exact: true });
    const empty = page.getByRole('heading', { name: 'Aún no tienes movimientos en este periodo' });
    await expect(kpis.or(empty)).toBeVisible();
  });

  test('pide el resumen del mes actual en COP, con el token', async () => {
    await expect.poll(() => summaryRequests.length).toBeGreaterThan(0);
    const request = summaryRequests[0]!;
    const url = new URL(request.url());

    expect(url.searchParams.get('currencyCode')).toBe('COP');
    expect(url.searchParams.get('from')).toMatch(/^\d{4}-\d{2}-01$/);
    expect(url.searchParams.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(request.headers().authorization).toMatch(/^Bearer .+/);
  });

  test('cambiar el periodo vuelve a pedir el resumen con otro rango', async ({ page }) => {
    await expect.poll(() => summaryRequests.length).toBeGreaterThan(0);
    const firstFrom = new URL(summaryRequests[0]!.url()).searchParams.get('from');

    await page.getByLabel('Periodo').selectOption('thisYear');

    await expect
      .poll(() => summaryRequests.map((request) => new URL(request.url()).searchParams.get('from')))
      .toContain(`${new Date().getFullYear()}-01-01`);
    expect(firstFrom).not.toBe(`${new Date().getFullYear()}-01-01`);
    await expect(page.getByLabel('Periodo')).toHaveValue('thisYear');
  });

  test('con datos, ingresos y egresos se distinguen por signo y texto, no solo por color', async ({ page }) => {
    const income = page.getByRole('heading', { level: 2, name: 'Ingresos', exact: true });
    await expect(income.or(page.getByRole('heading', { name: 'Aún no tienes movimientos en este periodo' }))).toBeVisible();
    test.skip(!(await income.isVisible()), 'El usuario de pruebas no tiene movimientos este mes.');

    await expect(page.locator('.kpi-value.income')).toContainText('+');
    await expect(page.locator('.kpi-value.expense')).toContainText('−');
    await expect(page.getByRole('img', { name: /Ingresos .* % y egresos .* % del total movido/ })).toBeVisible();
  });

  test('un token inválido (401) en el resumen cierra la sesión y vuelve al login', async ({ page }) => {
    await page.evaluate(() => {
      const raw = sessionStorage.getItem('crezia-session');
      if (!raw) return;
      const session = JSON.parse(raw) as { token: string };
      session.token = 'token-invalido';
      sessionStorage.setItem('crezia-session', JSON.stringify(session));
    });
    await page.reload(); // The Panel asks for its summary again, now with the bad token.

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Tu sesión expiró. Inicia sesión de nuevo.')).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('crezia-session'))).toBeNull();
  });
});
