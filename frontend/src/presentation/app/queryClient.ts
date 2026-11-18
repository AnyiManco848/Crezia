import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../infrastructure/http/errors';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // An answer from the API (400, 404...) will not change by asking again; only retry a lost connection, once.
        retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  });
}
