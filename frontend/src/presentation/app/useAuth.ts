import { useCallback, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService, type Credentials } from '../../infrastructure/services/authService';
import { sessionStore } from '../../infrastructure/storage/sessionStore';

export function useAuth() {
  const queryClient = useQueryClient();
  const { session, expired } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getState);

  const login = useCallback(async (credentials: Credentials) => {
    sessionStore.set(await authService.login(credentials));
  }, []);

  // Ends the session and drops every cached query, so the next user never sees the previous user's data.
  const logout = useCallback(() => {
    sessionStore.clear();
    queryClient.clear();
  }, [queryClient]);

  return { session, user: session?.user ?? null, expired, login, logout };
}
