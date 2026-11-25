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

const CATEGORIES: Category[] = [
  { id: 'cat1', userId: null, name: 'Viajes', description: null },
  { id: 'cat2', userId: 'u1', name: 'Compras', description: null },
  { id: 'cat3', userId: 'u1', name: 'Emergencias', description: null },
];

const goal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 'g1',
  categoryId: 'cat1',
  name: 'Viaje a Japón',
  reason: 'Travel',
  reasonOther: null,
  targetAmount: '1000000.00',
  currencyCode: 'COP',
  startDate: '2026-01-01',
  endDate: '2027-12-31',
  status: 'Active',
  accumulated: '350000.00',
  remaining: '650000.00',
  percentage: 35,
  ...overrides,
});

const FOUR: Goal[] = [
  goal(),
  goal({ id: 'g2', categoryId: 'cat2', name: 'Computador', reason: 'Technology', targetAmount: '3000000.00', accumulated: '3000000.00', remaining: '0.00', percentage: 100, status: 'Completed' }),
  goal({ id: 'g3', categoryId: 'cat3', name: 'Colchón de seguridad', reason: 'EmergencyFund', targetAmount: '500000.00', accumulated: '720000.00', remaining: '0.00', percentage: 100 }),
  goal({ id: 'g4', categoryId: 'cat1', name: 'Curso', reason: 'Other', reasonOther: 'Curso de cocina', targetAmount: '200.00', currencyCode: 'USD', accumulated: '0.00', remaining: '200.00', percentage: 0, status: 'Cancelled' }),
];

interface Call {
  method: string;
  url: URL;
  body: unknown;
}

const state: { goals: Goal[]; total: number | null; calls: Call[]; respond?: (call: Call) => Response | undefined } = {
  goals: FOUR,
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
    return json(CATEGORIES, 200, { 'X-Total-Count': String(CATEGORIES.length), 'X-Page': '1', 'X-Limit': '100' });
  }
  if (url.pathname === '/api/goals' && method === 'GET') {
    const page = Number(url.searchParams.get('page'));
    const limit = Number(url.searchParams.get('limit'));
    const total = state.total ?? state.goals.length;
    return json(state.goals.slice(0, limit), 200, { 'X-Total-Count': String(total), 'X-Page': String(page), 'X-Limit': String(limit) });
  }
  if (url.pathname === '/api/goals' && method === 'POST') return json({ id: 'new' }, 201);
  if (url.pathname.startsWith('/api/goals/') && method === 'PATCH') return json({ id: 'g1' });
  if (url.pathname.startsWith('/api/goals/') && method === 'DELETE') return json({ message: 'Meta eliminada con éxito' });
  return json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } }, 404);
});

const goalCalls = () => state.calls.filter((call) => call.method === 'GET' && call.url.pathname === '/api/goals');
const writeCalls = () => state.calls.filter((call) => call.method !== 'GET');

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
  state.goals = FOUR;
  state.total = null;
  state.calls = [];
  state.respond = undefined;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const rowOf = async (name: string) => {
  const cell = await screen.findByText(name);
  return cell.closest('tr')!;
};

async function openNew(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Viaje a Japón');
  await user.click(screen.getAllByRole('button', { name: 'Nueva meta' })[0]!);
  const dialog = await screen.findByRole('dialog', { name: 'Nueva meta' });
  // the category select is rendered once the categories arrive
  await within(dialog).findByRole('option', { name: 'Compras' });
  return dialog;
}

describe('Metas: list', () => {
  it('shows name, category, target, dates, progress and status of each goal', async () => {
    renderPage();

    const row = await rowOf('Viaje a Japón');
    await waitFor(() => expect(row).toHaveTextContent('Viajes'));
    expect(row).toHaveTextContent('Viaje');
    expect(row).toHaveTextContent(/\$\s*1\.000\.000/);
    expect(row).toHaveTextContent('01 ene 2026');
    expect(row).toHaveTextContent('31 dic 2027');
    expect(row).toHaveTextContent('Activa');
    expect(row).toHaveTextContent('35 %');
    expect(row).toHaveTextContent(/\$\s*350\.000 de \$\s*1\.000\.000/);
    expect(row).toHaveTextContent(/Faltan \$\s*650\.000/);
  });

  it('exposes the progress as an accessible progressbar with its value in text', async () => {
    renderPage();
    const row = await rowOf('Viaje a Japón');

    const bar = within(row).getByRole('progressbar', { name: 'Progreso de Viaje a Japón' });
    expect(bar).toHaveAttribute('aria-valuenow', '35');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar.getAttribute('aria-valuetext')).toMatch(/^35 %, /);
  });

  it('marks a met goal with text, not only color', async () => {
    renderPage();
    const row = await rowOf('Computador');

    expect(row).toHaveTextContent('Meta cumplida');
    expect(row).toHaveTextContent('Completada');
    expect(within(row).getByRole('progressbar')).toHaveClass('done');
    expect(within(row).getByRole('progressbar')).not.toHaveClass('over');
  });

  it('marks an exceeded goal with text and how much it was exceeded by', async () => {
    renderPage();
    const row = await rowOf('Colchón de seguridad');

    expect(row).toHaveTextContent(/Meta superada por \$\s*220\.000/);
    expect(within(row).getByRole('progressbar')).toHaveClass('over');
    expect(within(row).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows a goal without movements at 0 %, in its own currency and with the custom reason', async () => {
    renderPage();
    const row = await rowOf('Curso');

    expect(row).toHaveTextContent('0 %');
    expect(row).toHaveTextContent('Aún no hay gastos en esta categoría');
    expect(row).toHaveTextContent('Curso de cocina');
    expect(row).toHaveTextContent('Cancelada');
    expect(row).toHaveTextContent('200,00');
  });

  it('asks for page 1 with limit 20 and reads the total from the headers', async () => {
    state.total = 33;
    renderPage();

    await screen.findByText('Viaje a Japón');
    const first = goalCalls()[0]!;
    expect(first.url.searchParams.get('page')).toBe('1');
    expect(first.url.searchParams.get('limit')).toBe('20');
    expect(screen.getByText('Mostrando 1–4 de 33')).toBeInTheDocument();
  });

  it('goes to the next page and to another page size', async () => {
    const user = userEvent.setup();
    state.total = 33;
    renderPage();
    await screen.findByText('Viaje a Japón');

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(goalCalls().some((call) => call.url.searchParams.get('page') === '2')).toBe(true));

    await user.selectOptions(screen.getByLabelText('Elementos por página'), '50');
    await waitFor(() => expect(goalCalls().some((call) => call.url.searchParams.get('limit') === '50' && call.url.searchParams.get('page') === '1')).toBe(true));
  });

  it('shows the empty state with a button to create the first goal', async () => {
    state.goals = [];
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Aún no tienes metas' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nueva meta' }).length).toBeGreaterThan(0);
  });

  it('shows the error state and retries', async () => {
    const user = userEvent.setup();
    state.respond = (call) =>
      call.url.pathname === '/api/goals' ? json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } }, 500) : undefined;
    renderPage();

    expect(await screen.findByRole('heading', { name: 'No pudimos cargar las metas' })).toBeInTheDocument();
    state.respond = undefined;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Viaje a Japón')).toBeInTheDocument();
  });

  it('shows a loading state first', () => {
    renderPage();

    expect(screen.getByLabelText('Cargando tus metas')).toBeInTheDocument();
  });
});

describe('Metas: create', () => {
  it('validates before sending', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openNew(user);

    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(within(dialog).getByText('El nombre es obligatorio')).toBeInTheDocument();
    // the placeholder option has the same text, so the error is looked up among the alerts
    expect(within(dialog).getAllByRole('alert').map((node) => node.textContent)).toContain('Selecciona una categoría');
    expect(within(dialog).getByText('El monto es obligatorio')).toBeInTheDocument();
    expect(within(dialog).getByText('La fecha fin es obligatoria')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Nombre')).toHaveFocus();
    expect(writeCalls()).toHaveLength(0);
  });

  it('rejects an end date that is not after the start date and pesos with decimals', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openNew(user);

    await user.type(within(dialog).getByLabelText('Nombre'), 'Casa');
    await user.selectOptions(within(dialog).getByLabelText('Categoría'), 'cat2');
    await user.type(within(dialog).getByLabelText('Monto objetivo'), '1500000,50');
    await user.clear(within(dialog).getByLabelText('Fecha de inicio'));
    await user.type(within(dialog).getByLabelText('Fecha de inicio'), '2099-05-10');
    await user.type(within(dialog).getByLabelText('Fecha de fin'), '2099-05-10');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(within(dialog).getByText('La fecha fin debe ser posterior a la fecha inicio')).toBeInTheDocument();
    expect(within(dialog).getByText('En pesos colombianos el monto va sin decimales (por ejemplo 15000000)')).toBeInTheDocument();
    expect(writeCalls()).toHaveLength(0);
  });

  it('sends the goal, then closes, shows a toast and reads the list again', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openNew(user);

    await user.type(within(dialog).getByLabelText('Nombre'), '  Casa propia ');
    await user.selectOptions(within(dialog).getByLabelText('Categoría'), 'cat2');
    await user.selectOptions(within(dialog).getByLabelText('Motivo'), 'HomePurchase');
    await user.type(within(dialog).getByLabelText('Monto objetivo'), '80000000');
    await user.type(within(dialog).getByLabelText('Fecha de fin'), '2099-12-31');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(writeCalls()[0]).toMatchObject({
      method: 'POST',
      body: {
        categoryId: 'cat2',
        name: 'Casa propia',
        reason: 'HomePurchase',
        reasonOther: null,
        targetAmount: '80000000',
        currencyCode: 'COP',
        endDate: '2099-12-31',
      },
    });
    expect((writeCalls()[0]!.body as { status?: string }).status).toBeUndefined();
    expect(await screen.findByText('Meta creada')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Nueva meta' })).not.toBeInTheDocument();
    await waitFor(() => expect(goalCalls().length).toBeGreaterThan(1));
  });

  it('asks for the description only with the reason "Otro"', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openNew(user);

    expect(within(dialog).queryByLabelText('Describe el motivo')).not.toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText('Motivo'), 'Other');
    expect(within(dialog).getByLabelText('Describe el motivo')).toBeInTheDocument();
  });

  it('shows the 409 of a category that already has an active goal next to the category', async () => {
    const user = userEvent.setup();
    state.respond = (call) =>
      call.method === 'POST'
        ? json({ error: { code: 'CONFLICT', message: 'Ya tienes una meta activa en esta categoría. Complétala, cancélala o elimínala antes de crear otra' } }, 409)
        : undefined;
    renderPage();
    const dialog = await openNew(user);

    await user.type(within(dialog).getByLabelText('Nombre'), 'Otra meta');
    await user.selectOptions(within(dialog).getByLabelText('Categoría'), 'cat1');
    await user.type(within(dialog).getByLabelText('Monto objetivo'), '100000');
    await user.type(within(dialog).getByLabelText('Fecha de fin'), '2099-12-31');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByText(/Ya tienes una meta activa en esta categoría/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Nombre')).toHaveValue('Otra meta');
  });

  it('marks the field when the API answers 400', async () => {
    const user = userEvent.setup();
    state.respond = (call) =>
      call.method === 'POST'
        ? json({ error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: [{ path: 'body.endDate', message: 'La fecha fin no puede estar en el pasado' }] } }, 400)
        : undefined;
    renderPage();
    const dialog = await openNew(user);

    await user.type(within(dialog).getByLabelText('Nombre'), 'Casa');
    await user.selectOptions(within(dialog).getByLabelText('Categoría'), 'cat2');
    await user.type(within(dialog).getByLabelText('Monto objetivo'), '100000');
    await user.type(within(dialog).getByLabelText('Fecha de fin'), '2099-12-31');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByText('La fecha fin no puede estar en el pasado')).toBeInTheDocument();
  });
});

describe('Metas: edit', () => {
  it('opens with the current values, shows the status and sends the change with PATCH', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Viaje a Japón');
    await user.click(screen.getByRole('button', { name: 'Editar Viaje a Japón' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar meta' });
    await within(dialog).findByRole('option', { name: 'Compras' });

    expect(within(dialog).getByLabelText('Nombre')).toHaveValue('Viaje a Japón');
    expect(within(dialog).getByLabelText('Monto objetivo')).toHaveValue('1000000');
    expect(within(dialog).getByLabelText('Estado')).toHaveValue('Active');

    await user.selectOptions(within(dialog).getByLabelText('Estado'), 'Completed');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(writeCalls()[0]).toMatchObject({ method: 'PATCH', body: { name: 'Viaje a Japón', targetAmount: '1000000', status: 'Completed' } });
    expect(writeCalls()[0]!.url.pathname).toBe('/api/goals/g1');
    expect(await screen.findByText('Meta actualizada')).toBeInTheDocument();
  });
});

describe('Metas: delete', () => {
  it('asks for confirmation, deletes and shows a toast', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Computador');

    await user.click(screen.getByRole('button', { name: 'Eliminar Computador' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar meta' });
    expect(dialog).toHaveTextContent('Computador');
    expect(writeCalls()).toHaveLength(0);

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    expect(writeCalls()[0]).toMatchObject({ method: 'DELETE' });
    expect(writeCalls()[0]!.url.pathname).toBe('/api/goals/g2');
    expect(await screen.findByText('Meta eliminada')).toBeInTheDocument();
  });

  it('cancelling sends nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Computador');

    await user.click(screen.getByRole('button', { name: 'Eliminar Computador' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar meta' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(writeCalls()).toHaveLength(0);
  });

  it('shows the error in the dialog when the delete fails', async () => {
    const user = userEvent.setup();
    state.respond = (call) => (call.method === 'DELETE' ? json({ error: { code: 'NOT_FOUND', message: 'Meta no encontrada' } }, 404) : undefined);
    renderPage();
    await screen.findByText('Computador');

    await user.click(screen.getByRole('button', { name: 'Eliminar Computador' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar meta' });
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    expect(await within(dialog).findByText('Meta no encontrada')).toBeInTheDocument();
  });
});
