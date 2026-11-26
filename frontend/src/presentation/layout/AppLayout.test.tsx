import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Session } from '../../domain/types';
import { sessionStore } from '../../infrastructure/storage/sessionStore';
import { createQueryClient } from '../app/queryClient';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AppLayout } from './AppLayout';
import { NAV_ITEMS } from './nav';

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

function renderLayout(initialPath = '/panel') {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route element={<AppLayout />}>
              {NAV_ITEMS.map((nav) => (
                <Route key={nav.to} path={nav.to} element={<p>Pantalla {nav.label}</p>} />
              ))}
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  sessionStore.clear();
  sessionStore.set(session);
});

describe('AppLayout', () => {
  it('offers the five sections in the desktop and in the phone navigation', () => {
    renderLayout();

    for (const name of ['Principal', 'Principal (móvil)']) {
      const nav = screen.getByRole('navigation', { name });
      const links = within(nav).getAllByRole('link');
      expect(links.map((link) => link.getAttribute('href'))).toEqual(NAV_ITEMS.map((nav) => nav.to));
      expect(links.map((link) => link.textContent)).toEqual(NAV_ITEMS.map((nav) => nav.label));
    }
  });

  it('renders the page of the current route inside <main> and has a skip link to it', () => {
    renderLayout('/metas');

    expect(within(screen.getByRole('main')).getByText('Pantalla Metas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute('href', '#contenido');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido');
  });

  it('does not steal the focus on the first render', () => {
    renderLayout();

    expect(screen.getByRole('main')).not.toHaveFocus();
  });

  it('moves the focus to <main> after navigating, so screen readers announce the new page', async () => {
    renderLayout('/panel');

    await userEvent.click(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Cuentas' }));

    expect(screen.getByText('Pantalla Cuentas')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('marks only the current section as the current page', () => {
    renderLayout('/movimientos');

    const current = within(screen.getByRole('navigation', { name: 'Principal' })).getAllByRole('link', { current: 'page' });
    expect(current.map((link) => link.textContent)).toEqual(['Movimientos']);
  });

  it('has the account menu in the sidebar and in the top bar', () => {
    renderLayout();

    expect(screen.getAllByRole('button', { name: /Menú de cuenta/ })).toHaveLength(2);
  });
});
