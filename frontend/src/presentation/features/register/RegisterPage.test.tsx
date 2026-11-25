import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '../../../domain/types';
import { sessionStore } from '../../../infrastructure/storage/sessionStore';
import { createQueryClient } from '../../app/queryClient';
import { AppRoutes } from '../../app/routes';
import { ThemeProvider } from '../../theme/ThemeProvider';

const SESSION: Session = {
  token: 'jwt.new.account',
  user: { id: 'u9', documentId: '1000000009', name: 'Camila Rodríguez', email: 'camila@crezia.com', role: 'User', preferredCurrencyCode: 'COP' },
};

const GENERIC_CONFLICT = 'No pudimos crear la cuenta con esos datos. Revisa la información o inicia sesión si ya tienes una cuenta.';

const EMPTY_SUMMARY = { from: '2026-11-01', to: '2026-11-30', currencyCode: 'COP', totalIncome: '0.00', totalExpense: '0.00', balance: '0.00', movementCount: 0 };

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const apiError = (code: string, message: string, status: number, headers: Record<string, string> = {}, details?: unknown) =>
  json({ error: { code, message, ...(details ? { details } : {}) } }, status, headers);

interface Call {
  method: string;
  url: URL;
  body: Record<string, unknown> | undefined;
}

const state: { calls: Call[]; register: (call: Call) => Response | Promise<Response> } = {
  calls: [],
  register: () => json(SESSION, 201),
};

const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
  const url = new URL(String(input));
  const method = init?.method ?? 'GET';
  const call: Call = { method, url, body: init?.body ? JSON.parse(init.body as string) : undefined };
  state.calls.push(call);
  if (url.pathname === '/api/auth/register' && method === 'POST') return state.register(call);
  if (url.pathname === '/api/movements/summary') return json(EMPTY_SUMMARY);
  return apiError('NOT_FOUND', 'Ruta no encontrada', 404);
});

const registerCalls = () => state.calls.filter((call) => call.url.pathname === '/api/auth/register');

function renderApp(initialPath = '/registro') {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={[initialPath]}>
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function fillForm(user: User, overrides: Partial<Record<'name' | 'documentId' | 'birthDate' | 'email' | 'phone' | 'password' | 'confirmPassword', string>> = {}) {
  const values = {
    name: 'Camila Rodríguez',
    documentId: '1000000009',
    birthDate: '1995-03-10',
    email: 'Camila@Crezia.com',
    phone: '',
    password: 'Clave1234',
    confirmPassword: 'Clave1234',
    ...overrides,
  };
  await user.type(screen.getByLabelText('Nombre completo'), values.name);
  await user.type(screen.getByLabelText('Identificación (cédula)'), values.documentId);
  await user.type(screen.getByLabelText('Fecha de nacimiento'), values.birthDate);
  await user.type(screen.getByLabelText('Correo electrónico'), values.email);
  if (values.phone) await user.type(screen.getByLabelText('Teléfono celular (opcional)'), values.phone);
  await user.type(screen.getByLabelText('Contraseña'), values.password);
  await user.type(screen.getByLabelText('Confirmar contraseña'), values.confirmPassword);
}

const submit = (user: User) => user.click(screen.getByRole('button', { name: /Crear cuenta|Creando cuenta|Intenta de nuevo/ }));

beforeEach(() => {
  sessionStore.clear();
  state.calls = [];
  state.register = () => json(SESSION, 201);
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionStore.clear();
});

describe('Registro: pantalla', () => {
  it('shows the fields of the specification, the password requirements and the link to the login', () => {
    renderApp();

    expect(screen.getByRole('heading', { level: 1, name: 'Crea tu cuenta' })).toBeInTheDocument();
    for (const label of ['Nombre completo', 'Identificación (cédula)', 'Fecha de nacimiento', 'Correo electrónico', 'Teléfono celular (opcional)', 'Contraseña', 'Confirmar contraseña']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('list', { name: 'Requisitos de la contraseña' })).toHaveTextContent('Al menos 8 caracteres');
    expect(screen.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('radiogroup', { name: 'Tema de color' })).toBeInTheDocument();
  });

  it('does not let the person pick a birth date that makes them younger than 18', () => {
    renderApp();

    const max = screen.getByLabelText('Fecha de nacimiento').getAttribute('max')!;
    expect(max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number(max.slice(0, 4))).toBe(new Date().getFullYear() - 18);
  });

  it('links the login to the registration and back', async () => {
    const user = userEvent.setup();
    renderApp('/login');

    await user.click(screen.getByRole('link', { name: 'Registrarse' }));
    expect(await screen.findByRole('heading', { name: 'Crea tu cuenta' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Inicia sesión' }));
    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
  });

  it('sends a person who already has a session to the Panel', () => {
    sessionStore.set(SESSION);
    renderApp('/registro');

    expect(screen.getByRole('heading', { level: 1, name: 'Panel' })).toBeInTheDocument();
  });
});

describe('Registro: contraseña', () => {
  it('shows each requirement as met or pending in text, live', async () => {
    const user = userEvent.setup();
    renderApp();
    const list = screen.getByRole('list', { name: 'Requisitos de la contraseña' });
    expect(list).toHaveTextContent('Al menos 8 caracteres (pendiente)');

    await user.type(screen.getByLabelText('Contraseña'), 'abcdefgh');
    expect(list).toHaveTextContent('Al menos 8 caracteres (cumplido)');
    expect(list).toHaveTextContent('Una letra (cumplido)');
    expect(list).toHaveTextContent('Un número (pendiente)');

    await user.type(screen.getByLabelText('Contraseña'), '1');
    expect(list).toHaveTextContent('Un número (cumplido)');
  });

  it('describes the password field with the requirements', () => {
    renderApp();

    const list = screen.getByRole('list', { name: 'Requisitos de la contraseña' });
    expect(screen.getByLabelText('Contraseña').getAttribute('aria-describedby')).toContain(list.id);
  });

  it('has an accessible show/hide button for each password field', async () => {
    const user = userEvent.setup();
    renderApp();
    const password = screen.getByLabelText('Contraseña');
    const confirm = screen.getByLabelText('Confirmar contraseña');
    expect(password).toHaveAttribute('type', 'password');
    expect(confirm).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(confirm).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Mostrar confirmación de contraseña' }));
    expect(confirm).toHaveAttribute('type', 'text');
  });
});

describe('Registro: validación', () => {
  it('shows an error under each invalid field, focuses the first one and sends nothing', async () => {
    const user = userEvent.setup();
    renderApp();

    await submit(user);

    expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument();
    expect(screen.getByText('La identificación solo admite letras y números (máximo 20)')).toBeInTheDocument();
    expect(screen.getByText('El correo no es válido')).toBeInTheDocument();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Confirma tu contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre completo')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Nombre completo')).toHaveFocus();
    expect(registerCalls()).toHaveLength(0);
  });

  it('clears the error of a field when the person edits it', async () => {
    const user = userEvent.setup();
    renderApp();
    await submit(user);
    expect(screen.getByText('El correo no es válido')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Correo electrónico'), 'a');

    expect(screen.queryByText('El correo no es válido')).not.toBeInTheDocument();
  });

  it('rejects mismatching passwords and an under-age birth date', async () => {
    const user = userEvent.setup();
    renderApp();
    const year = new Date().getFullYear() - 10;

    await fillForm(user, { confirmPassword: 'Otra12345', birthDate: `${year}-05-05` });
    await submit(user);

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(screen.getByText('Debes tener 18 años o más', { selector: '.error-msg' })).toBeInTheDocument();
    expect(registerCalls()).toHaveLength(0);
  });
});

describe('Registro: envío', () => {
  it('sends the email in lowercase, an empty phone as null and no confirmation', async () => {
    const user = userEvent.setup();
    renderApp();

    await fillForm(user);
    await submit(user);

    await waitFor(() => expect(registerCalls()).toHaveLength(1));
    expect(registerCalls()[0]!.body).toEqual({
      name: 'Camila Rodríguez',
      documentId: '1000000009',
      birthDate: '1995-03-10',
      email: 'camila@crezia.com',
      phone: null,
      password: 'Clave1234',
    });
  });

  it('sends the phone when it is typed', async () => {
    const user = userEvent.setup();
    renderApp();

    await fillForm(user, { phone: '+57 300 123 4567' });
    await submit(user);

    await waitFor(() => expect(registerCalls()).toHaveLength(1));
    expect(registerCalls()[0]!.body).toMatchObject({ phone: '+57 300 123 4567' });
  });

  it('with a 201 stores the session like the login and goes to the Panel', async () => {
    const user = userEvent.setup();
    renderApp();

    await fillForm(user);
    await submit(user);

    expect(await screen.findByRole('heading', { level: 1, name: 'Panel' })).toBeInTheDocument();
    expect(sessionStore.getState().session).toEqual(SESSION);
    expect(JSON.parse(window.sessionStorage.getItem('crezia-session')!)).toEqual(SESSION);
  });

  it('blocks the button and the fields while sending, and sends once', async () => {
    const user = userEvent.setup();
    let release: (response: Response) => void = () => undefined;
    state.register = () => new Promise<Response>((resolve) => (release = resolve));
    renderApp();

    await fillForm(user);
    await submit(user);

    const button = await screen.findByRole('button', { name: 'Creando cuenta…' });
    expect(button).toBeDisabled();
    expect(screen.getByLabelText('Nombre completo')).toBeDisabled();
    await user.click(button);
    expect(registerCalls()).toHaveLength(1);

    await act(async () => release(json(SESSION, 201)));
    expect(await screen.findByRole('heading', { level: 1, name: 'Panel' })).toBeInTheDocument();
  });
});

describe('Registro: errores del servidor', () => {
  it('shows the 409 as a generic banner, marks no field and keeps what was typed', async () => {
    const user = userEvent.setup();
    state.register = () => apiError('CONFLICT', GENERIC_CONFLICT, 409);
    renderApp();

    await fillForm(user);
    await submit(user);

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(GENERIC_CONFLICT);
    // it never says which datum is taken
    expect(banner.textContent).not.toMatch(/correo ya|identificación ya|ya existe|ya está registrad/i);
    expect(screen.getByLabelText('Correo electrónico')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Identificación (cédula)')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('Camila@Crezia.com');
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
    expect(sessionStore.getState().session).toBeNull();
  });

  it('shows the 400 errors of the API under their fields and keeps what was typed', async () => {
    const user = userEvent.setup();
    state.register = () =>
      apiError('VALIDATION_ERROR', 'Datos inválidos', 400, {}, [
        { path: 'body.email', message: 'El correo no es válido' },
        { path: 'body.birthDate', message: 'Debes tener 18 años o más' },
      ]);
    renderApp();

    await fillForm(user);
    await submit(user);

    expect(await screen.findByText('El correo no es válido')).toBeInTheDocument();
    expect(screen.getByText('Debes tener 18 años o más', { selector: '.error-msg' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Camila Rodríguez');
    // errors under the fields, no banner
    expect(document.querySelector('.banner')).toBeNull();
  });

  it('shows a 400 that names no known field in a banner', async () => {
    const user = userEvent.setup();
    state.register = () => apiError('VALIDATION_ERROR', 'Datos inválidos', 400);
    renderApp();

    await fillForm(user);
    await submit(user);

    expect(await screen.findByText('Datos inválidos')).toBeInTheDocument();
  });

  it('shows a network error in Spanish and lets the person try again', async () => {
    const user = userEvent.setup();
    state.register = () => {
      throw new TypeError('Failed to fetch');
    };
    renderApp();

    await fillForm(user);
    await submit(user);

    expect(await screen.findByText('No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
  });

  it('shows an unexpected 500 in Spanish', async () => {
    const user = userEvent.setup();
    state.register = () => apiError('INTERNAL_ERROR', 'Ocurrió un error inesperado', 500);
    renderApp();

    await fillForm(user);
    await submit(user);

    expect(await screen.findByText('Ocurrió un error inesperado')).toBeInTheDocument();
  });
});

describe('Registro: 429 y Retry-After', () => {
  const tooMany = (headers: Record<string, string>) => apiError('TOO_MANY_REQUESTS', 'Demasiados intentos. Inténtalo de nuevo en unos minutos.', 429, headers);

  it('shows how many seconds are left, disables the button while it counts down and enables it again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    state.register = () => tooMany({ 'Retry-After': '3' });
    renderApp();

    await fillForm(user);
    await submit(user);

    expect(await screen.findByText('Demasiados intentos. Podrás intentarlo de nuevo en 3 segundos.')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Intenta de nuevo en \d s/ });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Intenta de nuevo en 3 s');
    expect(registerCalls()).toHaveLength(1);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: /Intenta de nuevo en 2 s/ })).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
    expect(screen.queryByText(/Demasiados intentos/)).not.toBeInTheDocument();
    // what was typed is still there
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Camila Rodríguez');
  });

  it('shows the API generic message and keeps the button enabled when Retry-After cannot be read (CORS)', async () => {
    const user = userEvent.setup();
    state.register = () => tooMany({});
    renderApp();

    await fillForm(user);
    await submit(user);

    expect(await screen.findByText('Demasiados intentos. Inténtalo de nuevo en unos minutos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
  });
});
