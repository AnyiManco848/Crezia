import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Session } from '../../domain/types';
import { sessionStore } from '../../infrastructure/storage/sessionStore';
import { createQueryClient } from '../app/queryClient';
import { UserMenu } from './UserMenu';

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

function renderMenu(variant: 'sidebar' | 'topbar' = 'sidebar') {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <UserMenu variant={variant} />
        <button>afuera</button>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const trigger = () => screen.getByRole('button', { name: /Menú de cuenta/ });
const item = () => screen.getByRole('menuitem', { name: 'Cerrar sesión', hidden: true });

beforeEach(() => {
  sessionStore.clear();
  sessionStore.set(session);
});

describe('UserMenu', () => {
  it('renders nothing without a session', () => {
    sessionStore.clear();

    const { container } = renderMenu();

    expect(container.querySelector('.user-wrap')).toBeNull();
  });

  it('shows name, email and initials in the sidebar', () => {
    renderMenu('sidebar');

    expect(trigger()).toHaveTextContent('Camila Rodríguez Pérez');
    expect(trigger()).toHaveTextContent('camila@crezia.com');
    expect(trigger()).toHaveTextContent('CP');
  });

  it('shows only the initials plus a hidden name in the compact top bar', () => {
    renderMenu('topbar');

    expect(trigger()).toHaveClass('compact');
    expect(trigger()).not.toHaveTextContent('camila@crezia.com');
    expect(trigger()).toHaveAccessibleName('Menú de cuenta: Camila Rodríguez Pérez');
  });

  it('opens and closes with the button and moves the focus to the item', async () => {
    renderMenu();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(item()).toHaveFocus();

    await userEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it.each(['{ArrowDown}', '{ArrowUp}'])('opens with %s on the button', async (key) => {
    renderMenu();
    trigger().focus();

    await userEvent.keyboard(key);

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(item()).toHaveFocus();
  });

  it('does not open with a key that is not part of the pattern', async () => {
    renderMenu();
    trigger().focus();

    await userEvent.keyboard('a');

    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes with Escape and returns the focus to the button', async () => {
    renderMenu();
    await userEvent.click(trigger());

    await userEvent.keyboard('{Escape}');

    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveFocus();
  });

  it('closes with Tab without stealing the focus back', async () => {
    renderMenu();
    await userEvent.click(trigger());

    await userEvent.keyboard('{Tab}');

    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).not.toHaveFocus();
  });

  it.each(['{ArrowDown}', '{ArrowUp}', '{Home}', '{End}'])('keeps the focus on the only item with %s', async (key) => {
    renderMenu();
    await userEvent.click(trigger());

    await userEvent.keyboard(key);

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(item()).toHaveFocus();
  });

  it('closes when the pointer goes down outside, but not inside', async () => {
    renderMenu();
    await userEvent.click(trigger());

    fireEvent.mouseDown(item());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseDown(screen.getByRole('button', { name: 'afuera' }));
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('stops listening to the pointer once it is closed', async () => {
    renderMenu();
    await userEvent.click(trigger());
    await userEvent.click(trigger());

    fireEvent.mouseDown(screen.getByRole('button', { name: 'afuera' }));

    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });
});
