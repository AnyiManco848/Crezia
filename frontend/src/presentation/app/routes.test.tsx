import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '../../domain/types';
import { sessionStore } from '../../infrastructure/storage/sessionStore';
import { ThemeProvider } from '../theme/ThemeProvider';
import { createQueryClient } from './queryClient';
import { AppRoutes } from './routes';

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

function LocationProbe() {
  const { pathname } = useLocation();
  return <output aria-label="ruta actual">{pathname}</output>;
}

function renderAt(path: string) {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

const currentPath = () => screen.getByLabelText('ruta actual').textContent;

beforeEach(() => {
  sessionStore.clear();
  // The pages only need to mount: their data requests stay pending, so the tests do not depend on API shapes.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AppRoutes - public routes', () => {
  it.each([
    ['/login', 'Inicia sesión'],
    ['/registro', 'Crea tu cuenta'],
  ])('%s opens without a session', (path, heading) => {
    renderAt(path);

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(currentPath()).toBe(path);
  });
});

describe('AppRoutes - protected routes', () => {
  it.each(['/', '/panel', '/movimientos', '/cuentas', '/metas', '/categorias'])(
    'sends a visitor without a session from %s to the login',
    (path) => {
      renderAt(path);

      expect(currentPath()).toBe('/login');
      expect(screen.getByRole('heading', { level: 1, name: 'Inicia sesión' })).toBeInTheDocument();
    },
  );

  describe('with a session', () => {
    beforeEach(() => sessionStore.set(session));

    it.each([
      ['/panel', 'Panel'],
      ['/movimientos', 'Movimientos'],
      ['/cuentas', 'Cuentas'],
      ['/metas', 'Metas'],
      ['/categorias', 'Categorías'],
    ])('%s shows its page inside the layout', (path, heading) => {
      renderAt(path);

      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
      expect(currentPath()).toBe(path);
    });

    it('redirects the root to the Panel', () => {
      renderAt('/');

      expect(currentPath()).toBe('/panel');
      expect(screen.getByRole('heading', { level: 1, name: 'Panel' })).toBeInTheDocument();
    });
  });
});

describe('AppRoutes - route not found', () => {
  it('shows the not-found page in Spanish with a way back to the Panel', () => {
    renderAt('/no-existe');

    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.getByText('La dirección que escribiste no existe.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al Panel' })).toHaveAttribute('href', '/panel');
    expect(currentPath()).toBe('/no-existe');
  });

  it('does not treat a nested unknown path as a protected page', () => {
    renderAt('/metas/otra-cosa');

    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });

  it('"Ir al Panel" sends a visitor without a session on to the login', async () => {
    renderAt('/no-existe');

    await userEvent.click(screen.getByRole('link', { name: 'Ir al Panel' }));

    expect(currentPath()).toBe('/login');
  });
});
