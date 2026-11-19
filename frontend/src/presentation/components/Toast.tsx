import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

const TOAST_MS = 3200;

interface ToastApi {
  // Shows a short confirmation ("Movimiento guardado"). A new message replaces the previous one.
  notify: (message: string) => void;
}

const ToastContext = createContext<ToastApi>({ notify: () => undefined });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

// One polite live region for the whole app, always in the DOM so screen readers announce the messages.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(''), TOAST_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={`toast${message ? ' show' : ''}`} role="status" aria-live="polite">
        {message}
      </div>
    </ToastContext.Provider>
  );
}
