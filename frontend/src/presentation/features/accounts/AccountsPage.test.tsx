import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BankAccount } from '../../../domain/types';
import { createQueryClient } from '../../app/queryClient';
import { ToastProvider } from '../../components/Toast';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AccountsPage } from './AccountsPage';

const account = (overrides: Partial<BankAccount> = {}): BankAccount => ({
  id: 'a1',
  bankName: 'Bancolombia',
  accountAlias: 'Gastos',
  accountType: 'Checking',
  currencyCode: 'COP',
  balance: '1803000.00',
  ...overrides,
});

const THREE: BankAccount[] = [
  account(),
  account({ id: 'a2', bankName: 'Nequi', accountAlias: null, accountType: 'Savings', balance: '-250000.00' }),
  account({ id: 'a3', bankName: 'Wise', accountAlias: 'Viajes', accountType: 'Other', currencyCode: 'USD', balance: '1234.50' }),
];

interface Call {
  method: string;
  url: URL;
  body: unknown;
}

const state: { accounts: BankAccount[]; total: number | null; calls: Call[]; respond?: (call: Call) => Response | undefined } = {
  accounts: THREE,
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

  if (url.pathname === '/api/bank-accounts' && method === 'GET') {
    const page = Number(url.searchParams.get('page'));
    const limit = Number(url.searchParams.get('limit'));
    const total = state.total ?? state.accounts.length;
    return json(state.accounts.slice(0, limit), 200, { 'X-Total-Count': String(total), 'X-Page': String(page), 'X-Limit': String(limit) });
  }
  if (url.pathname === '/api/bank-accounts' && method === 'POST') return json({ id: 'new' }, 201);
  if (url.pathname.startsWith('/api/bank-accounts/') && method === 'PATCH') return json({ id: 'a1' });
  if (url.pathname.startsWith('/api/bank-accounts/') && method === 'DELETE') return json({ message: 'Cuenta bancaria eliminada con éxito' });
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
            <AccountsPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  state.accounts = THREE;
  state.total = null;
  state.calls = [];
  state.respond = undefined;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function openEdit(user: ReturnType<typeof userEvent.setup>, name = 'Bancolombia') {
  await screen.findByText(name);
  await user.click(screen.getByRole('button', { name: `Editar ${name}` }));
  return screen.findByRole('dialog', { name: 'Editar cuenta' });
}

describe('Cuentas: list', () => {
  it('shows each account as a card with type, currency and signed balance', async () => {
    renderPage();

    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent('Bancolombia');
    expect(cards[0]).toHaveTextContent('Gastos');
    expect(cards[0]).toHaveTextContent('Corriente');
    expect(cards[0]).toHaveTextContent(/\$\s*1\.803\.000/);
    expect(cards[1]).toHaveTextContent('Sin alias');
    expect(cards[1]).toHaveTextContent(/−\s*\$\s*250\.000/);
    expect(cards[2]).toHaveTextContent('Moneda USD');
    expect(cards[2]).toHaveTextContent('1.234,50');
  });

  it('asks for page 1 with limit 20 and reads the total from the headers', async () => {
    state.total = 57;
    renderPage();

    await screen.findAllByRole('article');
    const first = listCalls()[0]!;
    expect(first.url.searchParams.get('page')).toBe('1');
    expect(first.url.searchParams.get('limit')).toBe('20');
    expect(screen.getByText('Mostrando 1–3 de 57')).toBeInTheDocument();
  });

  it('goes to the next page and to another page size', async () => {
    const user = userEvent.setup();
    state.total = 57;
    renderPage();
    await screen.findAllByRole('article');

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(listCalls().some((call) => call.url.searchParams.get('page') === '2')).toBe(true));

    await user.selectOptions(screen.getByLabelText('Elementos por página'), '50');
    await waitFor(() => expect(listCalls().some((call) => call.url.searchParams.get('limit') === '50' && call.url.searchParams.get('page') === '1')).toBe(true));
  });

  it('shows the empty state with a button to create the first account', async () => {
    state.accounts = [];
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Aún no tienes cuentas' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nueva cuenta' }).length).toBeGreaterThan(0);
  });

  it('shows the error state and retries', async () => {
    const user = userEvent.setup();
    state.respond = () => json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } }, 500);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'No pudimos cargar las cuentas' })).toBeInTheDocument();
    state.respond = undefined;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Nequi')).toBeInTheDocument();
  });

  it('shows a loading state first', () => {
    renderPage();

    expect(screen.getByLabelText('Cargando tus cuentas')).toBeInTheDocument();
  });
});

describe('Cuentas: create', () => {
  it('validates before sending', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole('article');
    await user.click(screen.getAllByRole('button', { name: 'Nueva cuenta' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Nueva cuenta' });

    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(within(dialog).getByText('El nombre del banco es obligatorio')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Banco')).toHaveFocus();
    expect(writeCalls()).toHaveLength(0);
  });

  it('sends the account with an empty alias as null, then closes and shows a toast', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole('article');
    await user.click(screen.getAllByRole('button', { name: 'Nueva cuenta' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Nueva cuenta' });

    await user.type(within(dialog).getByLabelText('Banco'), '  Davivienda ');
    await user.selectOptions(within(dialog).getByLabelText('Tipo de cuenta'), 'Credit');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(writeCalls()[0]).toMatchObject({
      method: 'POST',
      body: { bankName: 'Davivienda', accountAlias: null, accountType: 'Credit', currencyCode: 'COP' },
    });
    expect(await screen.findByText('Cuenta creada')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Nueva cuenta' })).not.toBeInTheDocument();
    // The list is read again after writing.
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(1));
  });

  it('puts a 400 from the API next to its field and keeps what was typed', async () => {
    const user = userEvent.setup();
    state.respond = (call) =>
      call.method === 'POST'
        ? json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Datos inválidos',
                details: [{ path: 'body.currencyCode', message: 'La moneda ZZZ no existe o no está activa' }],
              },
            },
            400,
          )
        : undefined;
    renderPage();
    await screen.findAllByRole('article');
    await user.click(screen.getAllByRole('button', { name: 'Nueva cuenta' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Nueva cuenta' });
    await user.type(within(dialog).getByLabelText('Banco'), 'Nu');

    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByText('La moneda ZZZ no existe o no está activa')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Banco')).toHaveValue('Nu');
  });
});

describe('Cuentas: edit', () => {
  it('loads the values and does not send the currency when it did not change', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openEdit(user);
    expect(within(dialog).getByLabelText('Banco')).toHaveValue('Bancolombia');
    expect(within(dialog).getByLabelText('Alias (opcional)')).toHaveValue('Gastos');

    await user.clear(within(dialog).getByLabelText('Alias (opcional)'));
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(writeCalls()[0]!.method).toBe('PATCH');
    expect(writeCalls()[0]!.url.pathname).toBe('/api/bank-accounts/a1');
    expect(writeCalls()[0]!.body).toEqual({ bankName: 'Bancolombia', accountAlias: null, accountType: 'Checking' });
    expect(await screen.findByText('Cuenta actualizada')).toBeInTheDocument();
  });

  it('shows the 409 (currency locked by movements) on the currency field', async () => {
    const user = userEvent.setup();
    state.respond = (call) =>
      call.method === 'PATCH'
        ? json({ error: { code: 'CONFLICT', message: 'No se puede cambiar la moneda de una cuenta que ya tiene movimientos' } }, 409)
        : undefined;
    renderPage();
    const dialog = await openEdit(user);

    await user.selectOptions(within(dialog).getByLabelText('Moneda'), 'USD');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByText('No se puede cambiar la moneda de una cuenta que ya tiene movimientos')).toBeInTheDocument();
    expect(writeCalls()[0]!.body).toMatchObject({ currencyCode: 'USD' });
    expect(screen.getByRole('dialog', { name: 'Editar cuenta' })).toBeInTheDocument();
  });
});

describe('Cuentas: delete', () => {
  it('asks for confirmation, deletes and refreshes the list', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Nequi');

    await user.click(screen.getByRole('button', { name: 'Eliminar Nequi' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar cuenta' });
    expect(dialog).toHaveTextContent('Sus movimientos se conservan');
    expect(writeCalls()).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(writeCalls()[0]).toMatchObject({ method: 'DELETE' });
    expect(writeCalls()[0]!.url.pathname).toBe('/api/bank-accounts/a2');
    expect(await screen.findByText('Cuenta eliminada')).toBeInTheDocument();
  });

  it('cancelling does not delete', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Nequi');
    await user.click(screen.getByRole('button', { name: 'Eliminar Nequi' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar cuenta' });

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog', { name: 'Eliminar cuenta' })).not.toBeInTheDocument();
    expect(writeCalls()).toHaveLength(0);
  });

  it('shows the error inside the dialog when the API fails', async () => {
    const user = userEvent.setup();
    state.respond = (call) => (call.method === 'DELETE' ? json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } }, 500) : undefined);
    renderPage();
    await screen.findByText('Nequi');
    await user.click(screen.getByRole('button', { name: 'Eliminar Nequi' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar cuenta' });

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    expect(await within(dialog).findByText('Ocurrió un error inesperado')).toBeInTheDocument();
  });
});
