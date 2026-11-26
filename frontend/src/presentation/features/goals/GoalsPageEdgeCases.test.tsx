import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category, Goal } from '../../../domain/types';
import { createQueryClient } from '../../app/queryClient';
import { ToastProvider } from '../../components/Toast';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { GoalsPage } from './GoalsPage';

const CATEGORIES: Category[] = [{ id: 'cat1', userId: null, name: 'Viajes', description: null }];

const goal = (id: string, name: string): Goal => ({
  id,
  categoryId: 'cat1',
  name,
  reason: 'Travel',
  reasonOther: null,
  targetAmount: '1000000.00',
  currencyCode: 'COP',
  startDate: '2026-01-01',
  endDate: '2027-12-31',
  status: 'Active',
  accumulated: '0.00',
  remaining: '1000000.00',
  percentage: 0,
});

// A fake API with two pages (limit 20): 20 goals on page 1 and one goal on page 2.
const FIRST_PAGE = Array.from({ length: 20 }, (_, i) => goal(`p1-${i}`, `Meta ${i + 1}`));
const LAST_ONE = goal('last', 'Meta final');

const api = {
  pageTwo: [LAST_ONE] as Goal[],
  failGoalsList: false,
  failCategories: false,
  requests: [] as { method: string; url: URL }[],
};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
  const url = new URL(String(input));
  const method = init?.method ?? 'GET';
  api.requests.push({ method, url });

  if (url.pathname === '/api/categories') {
    if (api.failCategories) return json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } }, 500);
    return json(CATEGORIES, 200, { 'X-Total-Count': '1', 'X-Page': '1', 'X-Limit': '100' });
  }
  if (url.pathname === '/api/goals' && method === 'GET') {
    if (api.failGoalsList) return json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } }, 500);
    const page = Number(url.searchParams.get('page'));
    const rows = page === 1 ? FIRST_PAGE : api.pageTwo;
    const total = FIRST_PAGE.length + api.pageTwo.length;
    return json(rows, 200, { 'X-Total-Count': String(total), 'X-Page': String(page), 'X-Limit': '20' });
  }
  if (url.pathname.startsWith('/api/goals/') && method === 'DELETE') {
    api.pageTwo = [];
    return json({ message: 'Meta eliminada con éxito' });
  }
  return json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } }, 404);
});

const goalGets = () => api.requests.filter((r) => r.method === 'GET' && r.url.pathname === '/api/goals');

function renderPage() {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={createQueryClient()}>
        <ToastProvider>
          <MemoryRouter>
            <GoalsPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  api.pageTwo = [LAST_ONE];
  api.failGoalsList = false;
  api.failCategories = false;
  api.requests = [];
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Metas: after deleting the only goal of the last page', () => {
  it('goes back to the previous page instead of showing an empty page', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Meta 1');

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Meta final')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Eliminar Meta final' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Eliminar meta' })).getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('Meta 1')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Aún no tienes metas' })).not.toBeInTheDocument();
    expect(goalGets().at(-1)!.url.searchParams.get('page')).toBe('1');
  });
});

describe('Metas: the list cannot be refreshed but there is data on screen', () => {
  it('keeps the old rows, explains the failure and refreshes on Reintentar', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Meta 1');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByText('Meta final');

    // The delete works but the list that follows it fails.
    await user.click(screen.getByRole('button', { name: 'Eliminar Meta final' }));
    api.failGoalsList = true;
    await user.click(within(await screen.findByRole('dialog', { name: 'Eliminar meta' })).getByRole('button', { name: 'Eliminar' }));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('No pudimos actualizar la lista');
    expect(screen.getByText('Meta final')).toBeInTheDocument();

    api.failGoalsList = false;
    await user.click(within(banner).getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(screen.queryByText('No pudimos actualizar la lista', { exact: false })).not.toBeInTheDocument());
    expect(await screen.findByText('Meta 1')).toBeInTheDocument();
  });
});

describe('Metas: the categories cannot be loaded when creating a goal', () => {
  it('says so inside the dialog, does not offer the form, and recovers on Reintentar', async () => {
    const user = userEvent.setup();
    api.failCategories = true;
    renderPage();
    await screen.findByText('Meta 1');

    await user.click(screen.getAllByRole('button', { name: 'Nueva meta' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Nueva meta' });
    expect(await within(dialog).findByText('No pudimos cargar tus categorías.', { exact: false })).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Nombre')).not.toBeInTheDocument();

    api.failCategories = false;
    await user.click(within(dialog).getByRole('button', { name: 'Reintentar' }));

    expect(await within(dialog).findByRole('option', { name: 'Viajes' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Nombre')).toBeInTheDocument();
  });
});
