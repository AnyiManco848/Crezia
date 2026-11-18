import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';
import { applyTheme, readStoredTheme, storeTheme } from './themeStorage';

const blocked = (() => {
  throw new Error('blocked');
}) as unknown as () => Storage;

describe('theme storage', () => {
  it('defaults to system and ignores unknown values', () => {
    expect(readStoredTheme()).toBe('system');
    window.localStorage.setItem('crezia-theme', 'purple');
    expect(readStoredTheme()).toBe('system');
  });

  it('stores light and dark under crezia-theme, and removes the key for system', () => {
    storeTheme('dark');
    expect(window.localStorage.getItem('crezia-theme')).toBe('dark');
    expect(readStoredTheme()).toBe('dark');

    storeTheme('system');
    expect(window.localStorage.getItem('crezia-theme')).toBeNull();
  });

  it('does not throw when localStorage is blocked', () => {
    expect(readStoredTheme(blocked)).toBe('system');
    expect(storeTheme('dark', blocked)).toBe(false);
  });

  it('sets and removes data-theme on <html>', () => {
    applyTheme('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    applyTheme('system');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});

describe('ThemeToggle', () => {
  it('has three named options and marks the stored one', () => {
    window.localStorage.setItem('crezia-theme', 'dark');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(screen.getByRole('radiogroup', { name: 'Tema de color' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Claro' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Sistema' })).not.toBeChecked();
  });

  it('applies and saves the chosen theme, and "Sistema" clears it', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('radio', { name: 'Oscuro' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem('crezia-theme')).toBe('dark');

    await user.click(screen.getByRole('radio', { name: 'Claro' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    await user.click(screen.getByRole('radio', { name: 'Sistema' }));
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(window.localStorage.getItem('crezia-theme')).toBeNull();
  });
});
