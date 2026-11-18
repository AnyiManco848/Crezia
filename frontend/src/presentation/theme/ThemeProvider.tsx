import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { applyTheme, readStoredTheme, storeTheme, type ThemeMode } from './themeStorage';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The inline-free script in index.html already set data-theme before the first paint; this only syncs React.
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredTheme());

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    applyTheme(next);
    storeTheme(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
