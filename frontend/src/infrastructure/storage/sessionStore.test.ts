import { describe, expect, it, vi } from 'vitest';
import type { Session } from '../../domain/types';
import { createSessionStore } from './sessionStore';

const session: Session = {
  token: 'jwt.token.value',
  user: {
    id: 'u1',
    documentId: '1000000001',
    name: 'Usuario de Prueba',
    email: 'test@crezia.com',
    role: 'User',
    preferredCurrencyCode: 'COP',
  },
};

describe('session store', () => {
  it('starts empty', () => {
    expect(createSessionStore(() => window.sessionStorage).getState()).toEqual({ session: null, expired: false });
  });

  it('keeps the session in sessionStorage (not localStorage) and restores it on reload', () => {
    createSessionStore(() => window.sessionStorage).set(session);

    expect(window.localStorage.length).toBe(0);
    expect(createSessionStore(() => window.sessionStorage).getState().session).toEqual(session);
  });

  it('clears the session and can flag it as expired', () => {
    const store = createSessionStore(() => window.sessionStorage);
    store.set(session);

    store.clear({ expired: true });

    expect(store.getState()).toEqual({ session: null, expired: true });
    expect(window.sessionStorage.getItem('crezia-session')).toBeNull();
  });

  it('resets the expired flag on a new login', () => {
    const store = createSessionStore(() => window.sessionStorage);
    store.clear({ expired: true });

    store.set(session);

    expect(store.getState().expired).toBe(false);
  });

  it('notifies subscribers until they unsubscribe', () => {
    const store = createSessionStore(() => window.sessionStorage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set(session);
    unsubscribe();
    store.clear();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores corrupt stored data', () => {
    window.sessionStorage.setItem('crezia-session', '{not json');
    expect(createSessionStore(() => window.sessionStorage).getState().session).toBeNull();

    window.sessionStorage.setItem('crezia-session', JSON.stringify({ token: 'x' }));
    expect(createSessionStore(() => window.sessionStorage).getState().session).toBeNull();
  });

  it('still works in memory when the storage is blocked', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    const store = createSessionStore(blocked as unknown as () => Storage);

    store.set(session);
    expect(store.getState().session).toEqual(session);

    store.clear();
    expect(store.getState().session).toBeNull();
  });
});
