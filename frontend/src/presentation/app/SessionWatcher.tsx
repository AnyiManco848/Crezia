import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sessionStore } from '../../infrastructure/storage/sessionStore';

// A 401 clears the session from inside the HTTP client; this also empties the query cache so no
// data of the ended session stays in memory.
export function SessionWatcher() {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      sessionStore.subscribe(() => {
        if (!sessionStore.getState().session) queryClient.clear();
      }),
    [queryClient],
  );

  return null;
}
