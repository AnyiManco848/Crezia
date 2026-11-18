import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '../../domain/types';
import { http } from '../../infrastructure/http';
import { sessionStore } from '../../infrastructure/storage/sessionStore';
import { ThemeProvider } from '../theme/ThemeProvider';
import { createQueryClient } from './queryClient';
import { AppRoutes } from './routes';
import { SessionWatcher } from './SessionWatcher';

const session: Session = {
  token: 'jwt.token.value',
  user: {
    id: 'u1',
    documentId: '1000000001',
    name: 'Camila Rodríguez Pérez',
    email: 'camila@crezia.com',
    role: 'User',
    preferredCurrencyCode: 'COP',
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function renderApp(initialPath: string) {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={createQueryClient()}>
        <SessionWatcher />
        <MemoryRouter initialEntries={[initialPath]}>
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  sessionStore.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('protected routes', () => {
  it('sends a visitor without a session to the login', () => {
    renderApp('/panel');

    expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
  });

  it('shows the layout with the real name, email and initials when there is a session', () => {
    sessionStore.set(session);
    renderApp('/panel');

    expect(screen.getByRole('heading', { level: 1, name: 'Panel' })).toBeInTheDocument();
    // Sidebar variant: name + email + initials. The phone top bar variant only has the avatar.
    const menuButton = screen.getByRole('button', { name: /Menú de cuenta: Camila Rodríguez Pérez\s*camila@crezia\.com/ });
    expect(menuButton).toHaveTextContent('CP');
    expect(menuButton).toHaveTextContent('camila@crezia.com');
    expect(screen.getAllByRole('button', { name: /Menú de cuenta/ })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Movimientos' }).length).toBeGreaterThan(0);
  });

  it('marks the current section with aria-current', () => {
    sessionStore.set(session);
    renderApp('/cuentas');

    for (const link of screen.getAllByRole('link', { name: 'Cuentas' })) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }
    for (const link of screen.getAllByRole('link', { name: 'Panel' })) {
      expect(link).not.toHaveAttribute('aria-current');
    }
  });

  it('skips the login when there is already a session', () => {
    sessionStore.set(session);
    renderApp('/login');

    expect(screen.getByRole('heading', { level: 1, name: 'Panel' })).toBeInTheDocument();
  });
});

describe('user menu', () => {
  it('opens with the keyboard, offers only "Cerrar sesión" and closes with Escape', async () => {
    sessionStore.set(session);
    const user = userEvent.setup();
    renderApp('/panel');

    const button = screen.getAllByRole('button', { name: /Menú de cuenta/ })[0]!;
    expect(button).toHaveAttribute('aria-expanded', 'false');

    button.focus();
    await user.keyboard('{ArrowDown}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const item = screen.getAllByRole('menuitem', { name: 'Cerrar sesión' })[0]!;
    expect(item).toHaveFocus();
    expect(screen.queryByRole('menuitem', { name: 'Mi perfil' })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('logs out: clears the session and the stored token and goes to the login', async () => {
    sessionStore.set(session);
    const user = userEvent.setup();
    renderApp('/panel');

    await user.click(screen.getAllByRole('button', { name: /Menú de cuenta/ })[0]!);
    await user.click(screen.getAllByRole('menuitem', { name: 'Cerrar sesión' })[0]!);

    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem('crezia-session')).toBeNull();
    expect(sessionStore.getState().session).toBeNull();
  });
});

describe('401 handling', () => {
  it('ends the session, goes to the login and explains why', async () => {
    sessionStore.set(session);
    renderApp('/panel');

    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'No autorizado' } }, 401));
    await expect(http.get('/api/goals')).rejects.toMatchObject({ status: 401 });

    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
    expect(screen.getByText('Tu sesión expiró. Inicia sesión de nuevo.')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('crezia-session')).toBeNull();
  });
});

describe('login screen', () => {
  it('shows a message under each empty field and does not call the API', async () => {
    const user = userEvent.setup();
    renderApp('/login');

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(screen.getByText('El correo es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Correo electrónico')).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs in, saves the session in sessionStorage and opens the Panel', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: session.token, user: session.user }));
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(screen.getByLabelText('Correo electrónico'), 'camila@crezia.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Test123*');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Panel' })).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/auth\/login$/);
    expect(JSON.parse(String(init!.body))).toEqual({ email: 'camila@crezia.com', password: 'Test123*' });
    expect(JSON.parse(window.sessionStorage.getItem('crezia-session')!)).toEqual(session);
    expect(window.localStorage.getItem('crezia-session')).toBeNull();
  });

  it('shows the backend message for wrong credentials and keeps what was typed', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Correo o contraseña incorrectos' } }, 401),
    );
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(screen.getByLabelText('Correo electrónico'), 'a@b.co');
    await user.type(screen.getByLabelText('Contraseña'), 'mala');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos');
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('a@b.co');
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
    expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
  });

  it('shows a network error in Spanish', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(screen.getByLabelText('Correo electrónico'), 'a@b.co');
    await user.type(screen.getByLabelText('Contraseña'), 'x');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con el servidor');
  });

  it('shows and hides the password with an accessible toggle', async () => {
    const user = userEvent.setup();
    renderApp('/login');

    const password = screen.getByLabelText('Contraseña');
    expect(password).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('puts the theme switch on the login and points "Registrarse" to the pending screen', async () => {
    const user = userEvent.setup();
    renderApp('/login');

    expect(screen.getByRole('radiogroup', { name: 'Tema de color' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Registrarse' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Registro' })).toBeInTheDocument());
  });
});
