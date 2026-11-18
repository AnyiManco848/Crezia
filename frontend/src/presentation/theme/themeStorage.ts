export type ThemeMode = 'light' | 'dark' | 'system';

// Keep the key in sync with public/theme-init.js (the script that avoids the flash on load).
export const THEME_KEY = 'crezia-theme';

// "system" is never stored: choosing it removes the key, so the OS preference decides.
export function readStoredTheme(getStorage: () => Storage = () => window.localStorage): ThemeMode {
  try {
    const value = getStorage().getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

// Returns false when localStorage is not available (private mode, blocked data); the theme still
// applies for the current session.
export function storeTheme(mode: ThemeMode, getStorage: () => Storage = () => window.localStorage): boolean {
  try {
    if (mode === 'system') getStorage().removeItem(THEME_KEY);
    else getStorage().setItem(THEME_KEY, mode);
    return true;
  } catch {
    return false;
  }
}

export function applyTheme(mode: ThemeMode, root: HTMLElement = document.documentElement): void {
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}
