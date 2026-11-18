import type { Session } from '../../domain/types';

const STORAGE_KEY = 'crezia-session';

export interface SessionState {
  session: Session | null;
  // True when the session ended because the API answered 401 (token expired or invalid).
  expired: boolean;
}

export interface SessionStore {
  getState(): SessionState;
  subscribe(listener: () => void): () => void;
  set(session: Session): void;
  clear(options?: { expired?: boolean }): void;
}

function isSession(value: unknown): value is Session {
  const candidate = value as Partial<Session> | null;
  return (
    typeof candidate?.token === 'string' &&
    candidate.token.length > 0 &&
    typeof candidate.user?.id === 'string' &&
    typeof candidate.user.name === 'string' &&
    typeof candidate.user.email === 'string'
  );
}

// The token lives in sessionStorage: it survives a reload but dies with the tab. Every access is in
// try/catch; if the storage is blocked, the session still works in memory until the page is reloaded.
export function createSessionStore(getStorage: () => Storage = () => window.sessionStorage): SessionStore {
  function load(): Session | null {
    try {
      const raw = getStorage().getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isSession(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  let state: SessionState = { session: load(), expired: false };
  const listeners = new Set<() => void>();

  function update(next: SessionState) {
    state = next;
    listeners.forEach((listener) => listener());
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(session) {
      try {
        getStorage().setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {
        /* Storage blocked: keep it in memory only. */
      }
      update({ session, expired: false });
    },
    clear({ expired = false } = {}) {
      try {
        getStorage().removeItem(STORAGE_KEY);
      } catch {
        /* Nothing to remove. */
      }
      update({ session: null, expired });
    },
  };
}

export const sessionStore = createSessionStore();
