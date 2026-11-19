import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MovementPayload } from '../../../application/validation/movementForm';
import type { MovementFilters } from '../../../domain/movementFilters';
import { catalogService } from '../../../infrastructure/services/catalogService';
import { movementService } from '../../../infrastructure/services/movementService';

export function useMovementList(filters: MovementFilters, page: number, limit: number, enabled: boolean) {
  return useQuery({
    queryKey: ['movements', 'list', filters, page, limit],
    queryFn: ({ signal }) => movementService.list({ filters, page, limit }, signal),
    enabled,
    // Keep the old rows on screen while the next page or filter loads: no flash of skeleton.
    placeholderData: keepPreviousData,
  });
}

// Categories and accounts for the selects. Keys start with 'categories' / 'accounts' so the screens that
// edit them (later parts) refresh these lists by invalidating those prefixes.
export function useCatalogs() {
  const categories = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: ({ signal }) => catalogService.listCategories(signal),
    staleTime: 60_000,
  });
  const accounts = useQuery({
    queryKey: ['accounts', 'all'],
    queryFn: ({ signal }) => catalogService.listBankAccounts(signal),
    staleTime: 60_000,
  });
  return { categories, accounts };
}

// A movement changes the Panel totals, the account balances and the goal progress.
function useInvalidateAfterWrite() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['movements'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['goals'] }),
    ]);
}

export function useSaveMovement(editingId: string | null) {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: (payload: MovementPayload) =>
      editingId ? movementService.update(editingId, payload) : movementService.create(payload),
    onSuccess: invalidate,
  });
}

export function useDeleteMovement() {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: (id: string) => movementService.remove(id),
    // Also after an error: a 404 means the movement is already gone, so the list must refresh.
    onSettled: invalidate,
  });
}
