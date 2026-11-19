import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DAILY_MESSAGES } from '../../../domain/dailyMessage';
import type { MovementSummary } from '../../../domain/types';
import { createQueryClient } from '../../app/queryClient';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { DashboardPage } from './DashboardPage';

function summary(overrides: Partial<MovementSummary> = {}): MovementSummary {
  return {
    from: '2026-11-01',
    to: '2026-11-30',
    currencyCode: 'COP',
    totalIncome: '7000000.00',
    totalExpense: '4500000.00',
    balance: '2500000.00',
    movementCount: 12,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const fetchMock = vi.fn<typeof fetch>();

function renderPanel() {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

const requestedUrls = () => fetchMock.mock.calls.map(([url]) => String(url));

beforeEach(() => {
  // Fixed "today" (2026-11-18, day 322 of the year) without freezing the timers that Testing Library uses.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 18, 12, 0));
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Panel: with data', () => {
  beforeEach(() => {
    fetchMock.mockImplementation(async () => jsonResponse(summary()));
  });

  it('asks for the current month in COP and shows income, expenses and balance with signs and text', async () => {
    renderPanel();

    const income = (await screen.findByRole('heading', { level: 2, name: 'Ingresos' })).closest('article')!;
    expect(income).toHaveTextContent(/\+\s*\$\s*7\.000\.000/);
    const expenses = screen.getByRole('heading', { level: 2, name: 'Egresos' }).closest('article')!;
    expect(expenses).toHaveTextContent(/−\s*\$\s*4\.500\.000/);
    const balance = screen.getByRole('heading', { level: 2, name: 'Balance' }).closest('article')!;
    expect(balance).toHaveTextContent(/\$\s*2\.500\.000/);
    expect(within(balance).getByText('Ingresos mayores que egresos')).toBeInTheDocument();

    expect(requestedUrls()[0]).toMatch(/\/api\/movements\/summary\?from=2026-11-01&to=2026-11-30&currencyCode=COP$/);
    expect(screen.getByText(/12 movimientos/)).toBeInTheDocument();
  });

  it('shows the savings rate (balance / income)', async () => {
    renderPanel();

    expect(await screen.findByText(/Tasa de ahorro:/)).toHaveTextContent(/35,7 %\s*de tus ingresos/);
  });

  it('draws the comparison bar with a text alternative and a legend that repeats the numbers', async () => {
    renderPanel();

    const bar = await screen.findByRole('img', { name: 'Ingresos 60,9 % y egresos 39,1 % del total movido' });
    expect(bar).toBeInTheDocument();
    const legend = screen.getByText('Ingresos 60,9 %').parentElement!.parentElement!;
    expect(legend).toHaveTextContent('Egresos 39,1 %');
  });

  it('shows the message of the day chosen by day of the year modulo 30', async () => {
    renderPanel();

    const region = screen.getByRole('region', { name: 'Mensaje del día' });
    expect(region).toHaveTextContent(DAILY_MESSAGES[322 % 30]!);
    await screen.findByText(/Tasa de ahorro/);
  });

  it('shows the period range in the subtitle', async () => {
    renderPanel();

    expect(await screen.findByText(/Resumen de 01 de nov de 2026 a 30 de nov de 2026 · 12 movimientos\./)).toBeInTheDocument();
  });
});

describe('Panel: negative balance and no income', () => {
  it('shows a minus sign, the "Egresos mayores" label and a negative savings rate', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(summary({ totalIncome: '1000000.00', totalExpense: '1250000.00', balance: '-250000.00' })),
    );
    renderPanel();

    const balance = (await screen.findByRole('heading', { level: 2, name: 'Balance' })).closest('article')!;
    expect(balance).toHaveTextContent(/−\s*\$\s*250\.000/);
    expect(within(balance).getByText('Egresos mayores que ingresos')).toBeInTheDocument();
    expect(balance).toHaveTextContent(/Tasa de ahorro:\s*−\s*25 %/);
  });

  it('hides the savings rate when there is no income', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(summary({ totalIncome: '0.00', totalExpense: '80000.00', balance: '-80000.00', movementCount: 2 })),
    );
    renderPanel();

    await screen.findByRole('heading', { level: 2, name: 'Balance' });
    expect(screen.queryByText(/Tasa de ahorro/)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Ingresos 0 % y egresos 100 %/ })).toBeInTheDocument();
  });

  it('says so when income equals expenses', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(summary({ totalIncome: '100.00', totalExpense: '100.00', balance: '0.00', movementCount: 2 })),
    );
    renderPanel();

    expect(await screen.findByText('Ingresos iguales a egresos')).toBeInTheDocument();
    expect(screen.getByText(/Tasa de ahorro:/)).toHaveTextContent('0 %');
  });
});

describe('Panel: states', () => {
  it('shows a skeleton with role status while loading', () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
    renderPanel();

    expect(screen.getByRole('status', { name: 'Cargando tu resumen' })).toBeInTheDocument();
    // The message of the day and the title do not wait for the API.
    expect(screen.getByRole('heading', { level: 1, name: 'Panel' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Mensaje del día' })).toBeInTheDocument();
  });

  it('shows the empty state with a "Nuevo movimiento" link and keeps the message of the day', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(summary({ totalIncome: '0.00', totalExpense: '0.00', balance: '0.00', movementCount: 0 })));
    renderPanel();

    expect(await screen.findByRole('heading', { name: 'Aún no tienes movimientos en este periodo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nuevo movimiento' })).toHaveAttribute('href', '/movimientos');
    expect(screen.getByRole('region', { name: 'Mensaje del día' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Ingresos' })).not.toBeInTheDocument();
  });

  it('shows an error with "Reintentar" and recovers on retry', async () => {
    fetchMock.mockImplementationOnce(async () =>
      jsonResponse({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } }, 500),
    );
    fetchMock.mockImplementation(async () => jsonResponse(summary()));
    const user = userEvent.setup();
    renderPanel();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos cargar tu resumen');
    expect(alert).toHaveTextContent('Ocurrió un error inesperado');

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Ingresos' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains a lost connection in Spanish', async () => {
    // A network failure is retried once by the query client; make both attempts fail.
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPanel();

    const alert = await screen.findByRole('alert', {}, { timeout: 4000 });
    expect(alert).toHaveTextContent('No pudimos conectar con el servidor');
  });
});

describe('Panel: period selector', () => {
  beforeEach(() => {
    fetchMock.mockImplementation(async () => jsonResponse(summary()));
  });

  it('has a visible label and the four periods, "Este mes" first', async () => {
    renderPanel();

    const select = screen.getByLabelText('Periodo');
    expect(select).toHaveValue('thisMonth');
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Este mes',
      'Mes anterior',
      'Últimos 30 días',
      'Este año',
    ]);
    await screen.findByText(/Tasa de ahorro/);
  });

  it('requests each period with its own range', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(/Tasa de ahorro/);

    await user.selectOptions(screen.getByLabelText('Periodo'), 'Mes anterior');
    await screen.findByText(/Tasa de ahorro/);
    await user.selectOptions(screen.getByLabelText('Periodo'), 'Últimos 30 días');
    await screen.findByText(/Tasa de ahorro/);
    await user.selectOptions(screen.getByLabelText('Periodo'), 'Este año');
    await screen.findByText(/Tasa de ahorro/);

    const urls = requestedUrls();
    expect(urls.some((url) => url.includes('from=2026-10-01&to=2026-10-31'))).toBe(true);
    expect(urls.some((url) => url.includes('from=2026-10-20&to=2026-11-18'))).toBe(true);
    expect(urls.some((url) => url.includes('from=2026-01-01&to=2026-12-31'))).toBe(true);
  });

  it('has the theme switch next to the selector, as the last element of the header', async () => {
    renderPanel();

    const actions = screen.getByLabelText('Periodo').closest('.head-actions')!;
    expect(within(actions as HTMLElement).getByRole('radiogroup', { name: 'Tema de color' })).toBeInTheDocument();
    expect(actions.lastElementChild).toHaveClass('theme-toggle');
    await screen.findByText(/Tasa de ahorro/);
  });
});
