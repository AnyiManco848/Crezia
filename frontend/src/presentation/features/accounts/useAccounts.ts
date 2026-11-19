import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AccountPayload } from '../../../application/validation/accountForm';
import { accountService } from '../../../infrastructure/services/accountService';

export function useAccountList(page: number, limit: number) {
  return useQuery({
    // Starts with 'accounts' so the movement screen's selects ('accounts','all') refresh with it.
    queryKey: ['accounts', 'list', page, limit],
    queryFn: ({ signal }) => accountService.list({ page, limit }, signal),
    placeholderData: keepPreviousData,
  });
}

// An account change also changes the names shown in movements.
function useInvalidateAfterWrite() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['movements'] }),
    ]);
}

export function useSaveAccount(editingId: string | null) {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: (payload: AccountPayload) =>
      editingId ? accountService.update(editingId, payload) : accountService.create(payload),
    onSuccess: invalidate,
  });
}

export function useDeleteAccount() {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: (id: string) => accountService.remove(id),
    // Also after an error: a 404 means the account is already gone, so the list must refresh.
    onSettled: invalidate,
  });
}
