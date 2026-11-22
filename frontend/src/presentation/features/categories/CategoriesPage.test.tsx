import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category } from '../../../domain/types';
import { createQueryClient } from '../../app/queryClient';
import { ToastProvider } from '../../components/Toast';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { CategoriesPage } from './CategoriesPage';

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 'c1',
  userId: null,
  name: 'Alimentación',
  description: 'Mercado y restaurantes',
  ...overrides,
});

const THREE: Category[] = [
  category(),
  category({ id: 'c2', userId: 'u1', name: 'Mascotas', description: null }),
  category({ id: 'c3', userId: 'u1', name: 'Regalos', description: 'Cumpleaños' }),
];

interface Call {
  method: string;
  url: URL;
  body: unknown;
}

const state: { categories: Category[]; total: number | null; calls: Call[]; respond?: (call: Call) => Response | undefined } = {
  categories: THREE,
  total: null,
  calls: [],
};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
  const url = new URL(String(input));
  const method = init?.method ?? 'GET';
  const call: Call = { method, url, body: init?.body ? JSON.parse(init.body as string) : undefined };
  state.calls.push(call);

  const forced = state.respond?.(call);
  if (forced) return forced;

  if (url.pathname === '/api/categories' && method === 'GET') {
    const page = Number(url.searchParams.get('page'));
    const limit = Number(url.searchParams.get('limit'));
    const total = state.total ?? state.categories.length;
    return json(state.categories.slice(0, limit), 200, { 'X-Total-Count': String(total), 'X-Page': String(page), 'X-Limit': String(limit) });
  }
  if (url.pathname === '/api/categories' && method === 'POST') return json({ id: 'new' }, 201);
  if (url.pathname.startsWith('/api/categories/') && method === 'PATCH') return json({ id: 'c2' });
  if (url.pathname.startsWith('/api/categories/') && method === 'DELETE') return json({ message: 'Categoría eliminada con éxito' });
  return json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } }, 404);
});

const listCalls = () => state.calls.filter((call) => call.method === 'GET');
const writeCalls = () => state.calls.filter((call) => call.method !== 'GET');

function renderPage() {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={createQueryClient()}>
        <ToastProvider>
          <MemoryRouter>
            <CategoriesPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  state.categories = THREE;
  state.total = null;
  state.calls = [];
  state.respond = undefined;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function openEdit(user: ReturnType<typeof userEvent.setup>, name = 'Mascotas') {
  await screen.findByText(name);
  await user.click(screen.getByRole('button', { name: `Editar ${name}` }));
  return screen.findByRole('dialog', { name: 'Editar categoría' });
}

describe('Categorías: list', () => {
  it('shows a table with name, description and origin', async () => {
    renderPage();

    const rows = await screen.findAllByRole('row');
    // header + 3 categories
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent('Alimentación');
    expect(rows[1]).toHaveTextContent('Mercado y restaurantes');
    expect(rows[1]).toHaveTextContent('Del sistema');
    expect(rows[2]).toHaveTextContent('Mascotas');
    expect(rows[2]).toHaveTextContent('Sin descripción');
    expect(rows[2]).toHaveTextContent('Tuya');
  });

  it('gives system categories no edit or delete buttons, and user categories both', async () => {
    renderPage();
    await screen.findByText('Mascotas');

    expect(screen.queryByRole('button', { name: 'Editar Alimentación' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar Alimentación' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Mascotas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar Regalos' })).toBeInTheDocument();
  });

  it('asks for page 1 with limit 20 and reads the total from the headers', async () => {
    state.total = 33;
    renderPage();

    await screen.findByText('Mascotas');
    const first = listCalls()[0]!;
    expect(first.url.searchParams.get('page')).toBe('1');
    expect(first.url.searchParams.get('limit')).toBe('20');
    expect(screen.getByText('Mostrando 1–3 de 33')).toBeInTheDocument();
  });

  it('goes to the next page and to another page size', async () => {
    const user = userEvent.setup();
    state.total = 33;
    renderPage();
    await screen.findByText('Mascotas');

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(listCalls().some((call) => call.url.searchParams.get('page') === '2')).toBe(true));

    await user.selectOptions(screen.getByLabelText('Elementos por página'), '50');
    await waitFor(() => expect(listCalls().some((call) => call.url.searchParams.get('limit') === '50' && call.url.searchParams.get('page') === '1')).toBe(true));
  });

  it('shows the empty state with a button to create the first category', async () => {
    state.categories = [];
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Aún no tienes categorías' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nueva categoría' }).length).toBeGreaterThan(0);
  });

  it('shows the error state and retries', async () => {
    const user = userEvent.setup();
    state.respond = () => json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } }, 500);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'No pudimos cargar las categorías' })).toBeInTheDocument();
    state.respond = undefined;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Mascotas')).toBeInTheDocument();
  });

  it('shows a loading state first', () => {
    renderPage();

    expect(screen.getByLabelText('Cargando tus categorías')).toBeInTheDocument();
  });
});

describe('Categorías: create', () => {
  it('validates before sending', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Mascotas');
    await user.click(screen.getAllByRole('button', { name: 'Nueva categoría' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Nueva categoría' });

    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(within(dialog).getByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Nombre')).toHaveFocus();
    expect(writeCalls()).toHaveLength(0);
  });

  it('sends the category with an empty description as null, then closes and shows a toast', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Mascotas');
    await user.click(screen.getAllByRole('button', { name: 'Nueva categoría' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Nueva categoría' });

    await user.type(within(dialog).getByLabelText('Nombre'), '  Salud ');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(writeCalls()[0]).toMatchObject({ method: 'POST', body: { name: 'Salud', description: null } });
    expect(await screen.findByText('Categoría creada')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Nueva categoría' })).not.toBeInTheDocument();
    // The list is read again after writing.
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(1));
  });

  it('marks the field when the API answers 400 and keeps what was typed', async () => {
    const user = userEvent.setup();
    state.respond = (call) =>
      call.method === 'POST'
        ? json(
            { error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: [{ path: 'body.name', message: 'El nombre no puede superar los 100 caracteres' }] } },
            400,
          )
        : undefined;
    renderPage();
    await screen.findByText('Mascotas');
    await user.click(screen.getAllByRole('button', { name: 'Nueva categoría' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Nueva categoría' });

    await user.type(within(dialog).getByLabelText('Nombre'), 'Salud');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByText('El nombre no puede superar los 100 caracteres')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Nombre')).toHaveValue('Salud');
  });

  it('shows other errors in a banner and stays open', async () => {
    const user = userEvent.setup();
    state.respond = (call) => (call.method === 'POST' ? json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } }, 500) : undefined);
    renderPage();
    await screen.findByText('Mascotas');
    await user.click(screen.getAllByRole('button', { name: 'Nueva categoría' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Nueva categoría' });

    await user.type(within(dialog).getByLabelText('Nombre'), 'Salud');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByText('Ocurrió un error inesperado')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Nueva categoría' })).toBeInTheDocument();
  });
});

describe('Categorías: edit', () => {
  it('opens with the current values and sends the change with PATCH', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openEdit(user);

    expect(within(dialog).getByLabelText('Nombre')).toHaveValue('Mascotas');
    expect(within(dialog).getByLabelText('Descripción (opcional)')).toHaveValue('');

    await user.type(within(dialog).getByLabelText('Descripción (opcional)'), 'Comida y veterinario');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(writeCalls()[0]).toMatchObject({
      method: 'PATCH',
      body: { name: 'Mascotas', description: 'Comida y veterinario' },
    });
    expect(writeCalls()[0]!.url.pathname).toBe('/api/categories/c2');
    expect(await screen.findByText('Categoría actualizada')).toBeInTheDocument();
  });

  it('shows the 403 of a system category in a banner', async () => {
    const user = userEvent.setup();
    state.respond = (call) =>
      call.method === 'PATCH'
        ? json({ error: { code: 'FORBIDDEN', message: 'Las categorías del sistema no se pueden editar' } }, 403)
        : undefined;
    renderPage();
    const dialog = await openEdit(user);

    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByText('Las categorías del sistema no se pueden editar')).toBeInTheDocument();
  });
});

describe('Categorías: delete', () => {
  it('asks for confirmation, deletes and shows a toast', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Regalos');

    await user.click(screen.getByRole('button', { name: 'Eliminar Regalos' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar categoría' });
    expect(dialog).toHaveTextContent('Regalos');
    expect(writeCalls()).toHaveLength(0);

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(writeCalls()[0]).toMatchObject({ method: 'DELETE' });
    expect(writeCalls()[0]!.url.pathname).toBe('/api/categories/c3');
    expect(await screen.findByText('Categoría eliminada')).toBeInTheDocument();
  });

  it('cancelling sends nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Regalos');

    await user.click(screen.getByRole('button', { name: 'Eliminar Regalos' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar categoría' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(writeCalls()).toHaveLength(0);
  });

  it('shows the error in the dialog when the delete fails', async () => {
    const user = userEvent.setup();
    state.respond = (call) => (call.method === 'DELETE' ? json({ error: { code: 'NOT_FOUND', message: 'Categoría no encontrada' } }, 404) : undefined);
    renderPage();
    await screen.findByText('Regalos');

    await user.click(screen.getByRole('button', { name: 'Eliminar Regalos' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar categoría' });
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    expect(await within(dialog).findByText('Categoría no encontrada')).toBeInTheDocument();
  });
});
