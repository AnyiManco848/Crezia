import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BankAccount, Category, Movement } from '../../../domain/types';
import { createQueryClient } from '../../app/queryClient';
import { ToastProvider } from '../../components/Toast';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { MovementsPage } from './MovementsPage';

const CAT_FOOD = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const CAT_SALARY = '8d0f7780-8536-41ef-a55c-f18fd2a01bf8';
const ACC_MAIN = '3b241101-e2bb-4255-8caf-4136c566a962';

const categories: Category[] = [
  { id: CAT_FOOD, userId: null, name: 'Alimentación', description: null },
  { id: CAT_SALARY, userId: 'u1', name: 'Salario', description: null },
];
const accounts: BankAccount[] = [
  { id: ACC_MAIN, bankName: 'Bancolombia', accountAlias: 'Gastos', accountType: 'Savings', currencyCode: 'COP' },
];

const movement = (overrides: Partial<Movement> = {}): Movement => ({
  id: 'm1',
  bankAccountId: ACC_MAIN,
  categoryId: CAT_FOOD,
  type: 'Expense',
  amount: '85000.00',
  currencyCode: 'COP',
  date: '2026-11-15',
  paymentMethod: 'DebitCard',
  description: 'Mercado del mes',
  ...overrides,
});

const THREE: Movement[] = [
  movement(),
  movement({ id: 'm2', type: 'Income', amount: '3500000.00', categoryId: CAT_SALARY, bankAccountId: null, paymentMethod: 'Transfer', description: 'Nómina', date: '2026-11-01' }),
  movement({ id: 'm3', description: null, amount: '12000.50', bankAccountId: 'deleted-account', categoryId: 'deleted-category', paymentMethod: 'Cash' }),
];

interface Call {
  method: string;
  url: URL;
  body: unknown;
}

// A tiny fake of the API: lists answer from `state`, writes are recorded, and `respond` can force any answer.
const state: {
  movements: Movement[];
  total: number | null;
  calls: Call[];
  respond?: (call: Call) => Response | undefined;
  failCatalogs: boolean;
} = { movements: THREE, total: null, calls: [], failCatalogs: false };

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
  const url = new URL(String(input));
  const method = init?.method ?? 'GET';
  const call: Call = { method, url, body: init?.body ? JSON.parse(init.body as string) : undefined };
  state.calls.push(call);

  const forced = state.respond?.(call);
  if (forced) return forced;

  if (url.pathname === '/api/categories' || url.pathname === '/api/bank-accounts') {
    if (state.failCatalogs) return json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } }, 500);
    const items = url.pathname === '/api/categories' ? categories : accounts;
    return json(items, 200, { 'X-Total-Count': String(items.length), 'X-Page': '1', 'X-Limit': '100' });
  }
  if (url.pathname === '/api/movements' && method === 'GET') {
    const page = Number(url.searchParams.get('page'));
    const limit = Number(url.searchParams.get('limit'));
    const type = url.searchParams.get('type');
    const rows = state.movements.filter((row) => !type || row.type === type);
    const total = state.total ?? rows.length;
    return json({ data: rows.slice(0, limit), page, limit, total });
  }
  if (url.pathname === '/api/movements' && method === 'POST') return json({ id: 'new' }, 201);
  if (url.pathname.startsWith('/api/movements/') && method === 'PATCH') return json({ id: 'm1' });
  if (url.pathname.startsWith('/api/movements/') && method === 'DELETE') return json({ message: 'Movimiento eliminado con éxito' });
  return json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } }, 404);
});

const listCalls = () => state.calls.filter((call) => call.url.pathname === '/api/movements' && call.method === 'GET');
const writeCalls = () => state.calls.filter((call) => call.method !== 'GET');

function renderPage() {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={createQueryClient()}>
        <ToastProvider>
          <MemoryRouter>
            <MovementsPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 18, 12, 0));
  state.movements = THREE;
  state.total = null;
  state.calls = [];
  state.respond = undefined;
  state.failCatalogs = false;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function openNewMovement(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('table');
  await user.click(screen.getAllByRole('button', { name: 'Nuevo movimiento' })[0]!);
  const dialog = await screen.findByRole('dialog', { name: 'Nuevo movimiento' });
  await within(dialog).findByLabelText('Monto'); // the catalogs have loaded
  return dialog;
}

describe('Movimientos: list', () => {
  it('shows each movement with date, category, account, method, type and signed amount', async () => {
    renderPage();

    const table = await screen.findByRole('table', { name: 'Movimientos' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);

    expect(rows[0]).toHaveTextContent('Mercado del mes');
    expect(rows[0]).toHaveTextContent('15 nov 2026 · Alimentación');
    expect(rows[0]).toHaveTextContent('Bancolombia · Gastos');
    expect(rows[0]).toHaveTextContent('Tarjeta débito');
    expect(rows[0]).toHaveTextContent('Gasto');
    expect(rows[0]).toHaveTextContent(/−\s*\$\s*85\.000/);

    expect(rows[1]).toHaveTextContent('Nómina');
    expect(rows[1]).toHaveTextContent('Sin cuenta');
    expect(rows[1]).toHaveTextContent('Ingreso');
    expect(rows[1]).toHaveTextContent(/\+\s*\$\s*3\.500\.000/);

    expect(listCalls()[0]!.url.search).toBe('?page=1&limit=20');
    expect(screen.getByText('Mostrando 1–3 de 3')).toBeInTheDocument();
  });

  it('says so when the description is empty and a category or account no longer exists', async () => {
    renderPage();

    const row = (await screen.findAllByRole('row'))[3]!;
    expect(row).toHaveTextContent('Sin descripción');
    expect(row).toHaveTextContent('Categoría no disponible');
    expect(row).toHaveTextContent('Cuenta no disponible');
  });

  it('shows the skeleton while loading', () => {
    state.respond = (call) => (call.url.pathname === '/api/movements' ? new Promise<Response>(() => undefined) as never : undefined);
    renderPage();

    expect(screen.getByRole('status', { name: 'Cargando tus movimientos' })).toBeInTheDocument();
  });

  it('shows the error with a retry button that asks again', async () => {
    const user = userEvent.setup();
    state.respond = (call) =>
      call.url.pathname === '/api/movements' && call.method === 'GET' && listCalls().length === 1
        ? json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } }, 500)
        : undefined;
    renderPage();

    expect(await screen.findByRole('heading', { name: 'No pudimos cargar los movimientos' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('shows the first-use empty state with a way to create a movement', async () => {
    state.movements = [];
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Aún no tienes movimientos' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nuevo movimiento' })).toHaveLength(2);
  });
});

describe('Movimientos: pagination (total in the body)', () => {
  it('moves between pages using page and limit, and the total comes from the body', async () => {
    const user = userEvent.setup();
    state.total = 45;
    renderPage();

    expect(await screen.findByText(/Página 1 de 3/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() => expect(listCalls().at(-1)!.url.search).toBe('?page=2&limit=20'));
    expect(await screen.findByText(/Página 2 de 3/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
  });

  it('changing the page size goes back to page 1', async () => {
    const user = userEvent.setup();
    state.total = 45;
    renderPage();
    await screen.findByText(/Página 1 de 3/);
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByText(/Página 2 de 3/);

    await user.selectOptions(screen.getByLabelText('Elementos por página'), '50');

    await waitFor(() => expect(listCalls().at(-1)!.url.search).toBe('?page=1&limit=50'));
    expect(await screen.findByText(/Página 1 de 1/)).toBeInTheDocument();
  });

  it('returns to the last page when the current one is left empty (after deleting its last item)', async () => {
    const user = userEvent.setup();
    state.total = 21; // 20 on page 1 and 1 on page 2
    renderPage();
    await screen.findByText(/Página 1 de 2/);
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByText(/Página 2 de 2/);

    // Once the only item of page 2 is deleted, the API answers an empty page 2 and a total of 20.
    state.respond = (call) =>
      call.url.pathname === '/api/movements' && call.method === 'GET' && call.url.searchParams.get('page') === '2'
        ? json({ data: [], page: 2, limit: 20, total: 20 })
        : undefined;
    await user.click(screen.getAllByRole('button', { name: 'Eliminar Mercado del mes' })[0]!);
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(listCalls().at(-1)!.url.searchParams.get('page')).toBe('1'));
    expect(await screen.findByText(/Página 1 de/)).toBeInTheDocument();
  });
});

describe('Movimientos: filters', () => {
  it('sends the chosen type and goes back to page 1', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('table');

    await user.selectOptions(screen.getByLabelText('Tipo'), 'Expense');

    await waitFor(() => expect(listCalls().at(-1)!.url.search).toBe('?type=Expense&page=1&limit=20'));
  });

  it('sends category, account and dates, and "Limpiar filtros" clears them all', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('table');
    await screen.findByRole('option', { name: 'Bancolombia · Gastos' });

    await user.selectOptions(screen.getByLabelText('Categoría'), CAT_FOOD);
    await user.selectOptions(screen.getByLabelText('Cuenta'), ACC_MAIN);
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-11-30' } });

    await waitFor(() => {
      const query = listCalls().at(-1)!.url.searchParams;
      expect(query.get('categoryId')).toBe(CAT_FOOD);
      expect(query.get('bankAccountId')).toBe(ACC_MAIN);
      expect(query.get('from')).toBe('2026-11-01');
      expect(query.get('to')).toBe('2026-11-30');
    });

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    // The unfiltered list is already cached, so clearing shows it again without another request.
    await waitFor(() => expect(screen.getByLabelText('Desde')).toHaveValue(''));
    expect(screen.getByLabelText('Hasta')).toHaveValue('');
    expect(screen.getByLabelText('Categoría')).toHaveValue('');
    expect(screen.getByLabelText('Cuenta')).toHaveValue('');
    expect(screen.getByLabelText('Tipo')).toHaveValue('');
    expect(await screen.findByText('Mostrando 1–3 de 3')).toBeInTheDocument();
  });

  it('does not ask the API when "Desde" is after "Hasta" and shows the error', async () => {
    renderPage();
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-11-01' } });
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(1));
    const before = listCalls().length;

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-10' } });

    expect(await screen.findByText('La fecha "Desde" no puede ser posterior a "Hasta"')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toHaveAttribute('aria-invalid', 'true');
    expect(listCalls()).toHaveLength(before);
  });

  it('with filters and no result, offers to clear them', async () => {
    const user = userEvent.setup();
    state.movements = [];
    state.respond = undefined;
    renderPage();
    await screen.findByRole('heading', { name: 'Aún no tienes movimientos' });

    await user.selectOptions(screen.getByLabelText('Tipo'), 'Income');

    expect(await screen.findByRole('heading', { name: 'No hay movimientos con estos filtros' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[1]!);
    expect(await screen.findByRole('heading', { name: 'Aún no tienes movimientos' })).toBeInTheDocument();
  });
});

describe('Movimientos: create', () => {
  it('validates before sending: nothing is posted with an empty amount or category', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openNewMovement(user);

    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByText('El monto es obligatorio')).toBeInTheDocument();
    expect(within(dialog).getByText('Selecciona una categoría', { selector: '.error-msg' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Monto')).toHaveFocus();
    expect(writeCalls()).toHaveLength(0);
  });

  it('posts a movement without account with its currency, confirms and refreshes the list', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openNewMovement(user);
    const listsBefore = listCalls().length;

    expect(within(dialog).getByLabelText('Fecha')).toHaveValue('2026-11-18');
    await user.type(within(dialog).getByLabelText('Monto'), '85000,50');
    await user.selectOptions(within(dialog).getByLabelText('Categoría'), CAT_FOOD);
    await user.selectOptions(within(dialog).getByLabelText('Moneda'), 'USD');
    await user.type(within(dialog).getByLabelText('Descripción (opcional)'), '  Almuerzo ');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(writeCalls()[0]!.method).toBe('POST');
    expect(writeCalls()[0]!.body).toEqual({
      type: 'Expense',
      amount: '85000.50',
      date: '2026-11-18',
      categoryId: CAT_FOOD,
      bankAccountId: null,
      paymentMethod: 'Cash',
      description: 'Almuerzo',
      currencyCode: 'USD',
    });
    expect(await screen.findByText('Movimiento guardado')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(listsBefore));
  });

  it('with an account the currency field disappears and no currency is sent', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openNewMovement(user);

    await user.selectOptions(within(dialog).getByLabelText('Cuenta'), ACC_MAIN);
    expect(within(dialog).queryByLabelText('Moneda')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('radio', { name: 'Ingreso' }));
    await user.type(within(dialog).getByLabelText('Monto'), '100');
    await user.selectOptions(within(dialog).getByLabelText('Categoría'), CAT_SALARY);
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(writeCalls()[0]!.body).toMatchObject({ type: 'Income', bankAccountId: ACC_MAIN });
    expect(writeCalls()[0]!.body).not.toHaveProperty('currencyCode');
  });

  it('shows a server 400 next to its field, keeps what was typed and keeps the dialog open', async () => {
    const user = userEvent.setup();
    state.respond = (call) =>
      call.method === 'POST'
        ? json(
            { error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: [{ path: 'body.amount', message: 'El monto admite hasta 12 dígitos enteros y 2 decimales' }] } },
            400,
          )
        : undefined;
    renderPage();
    const dialog = await openNewMovement(user);

    await user.type(within(dialog).getByLabelText('Monto'), '50');
    await user.selectOptions(within(dialog).getByLabelText('Categoría'), CAT_FOOD);
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByText('El monto admite hasta 12 dígitos enteros y 2 decimales')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Monto')).toHaveValue('50');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  it('shows other errors in a banner (here a connection failure) and keeps the form', async () => {
    const user = userEvent.setup();
    state.respond = (call) => (call.method === 'POST' ? (Promise.reject(new TypeError('Failed to fetch')) as never) : undefined);
    renderPage();
    const dialog = await openNewMovement(user);

    await user.type(within(dialog).getByLabelText('Monto'), '50');
    await user.selectOptions(within(dialog).getByLabelText('Categoría'), CAT_FOOD);
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByText(/No pudimos conectar con el servidor/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Monto')).toHaveValue('50');
  });

  it('closes with Cancelar without sending anything', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openNewMovement(user);

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(writeCalls()).toHaveLength(0);
  });

  it('explains a catalog failure inside the dialog and can retry', async () => {
    const user = userEvent.setup();
    state.failCatalogs = true;
    renderPage();
    await screen.findByRole('table');
    await user.click(screen.getAllByRole('button', { name: 'Nuevo movimiento' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo movimiento' });

    expect(await within(dialog).findByText(/No pudimos cargar tus categorías y cuentas/)).toBeInTheDocument();
    state.failCatalogs = false;
    await user.click(within(dialog).getByRole('button', { name: 'Reintentar' }));

    expect(await within(dialog).findByLabelText('Monto')).toBeInTheDocument();
  });
});

describe('Movimientos: edit', () => {
  it('prefills the form and sends a PATCH to the movement id', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'Editar Mercado del mes' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar movimiento' });
    const amount = await within(dialog).findByLabelText('Monto');
    expect(amount).toHaveValue('85000');
    expect(within(dialog).getByLabelText('Cuenta')).toHaveValue(ACC_MAIN);
    expect(within(dialog).getByLabelText('Método de pago')).toHaveValue('DebitCard');

    await user.clear(amount);
    await user.type(amount, '90000');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(writeCalls()[0]!.method).toBe('PATCH');
    expect(writeCalls()[0]!.url.pathname).toBe('/api/movements/m1');
    expect(writeCalls()[0]!.body).toMatchObject({ amount: '90000', bankAccountId: ACC_MAIN, categoryId: CAT_FOOD });
    expect(await screen.findByText('Movimiento actualizado')).toBeInTheDocument();
  });

  it('keeps a deleted category visible in the form and asks to choose another one only if it changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('table');

    await user.click(screen.getAllByRole('button', { name: 'Editar movimiento' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Editar movimiento' });

    expect(await within(dialog).findByLabelText('Categoría')).toHaveValue('deleted-category');
    expect(within(dialog).getByRole('option', { name: 'Categoría no disponible' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: 'Cuenta no disponible' })).toBeInTheDocument();
  });
});

describe('Movimientos: delete', () => {
  it('asks for confirmation, deletes by id, confirms and refreshes the list', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('table');
    const listsBefore = listCalls().length;

    await user.click(screen.getByRole('button', { name: 'Eliminar Mercado del mes' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar movimiento' });
    expect(dialog).toHaveTextContent('¿Eliminar este movimiento?');
    expect(writeCalls()).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(writeCalls()[0]!.method).toBe('DELETE');
    expect(writeCalls()[0]!.url.pathname).toBe('/api/movements/m1');
    expect(await screen.findByText('Movimiento eliminado')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(listsBefore));
  });

  it('cancelling deletes nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'Eliminar Mercado del mes' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    expect(writeCalls()).toHaveLength(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the API message when the movement no longer exists and keeps the dialog open', async () => {
    const user = userEvent.setup();
    state.respond = (call) =>
      call.method === 'DELETE' ? json({ error: { code: 'NOT_FOUND', message: 'Movimiento no encontrado' } }, 404) : undefined;
    renderPage();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'Eliminar Mercado del mes' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar movimiento' });
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    expect(await within(dialog).findByText('Movimiento no encontrado')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
