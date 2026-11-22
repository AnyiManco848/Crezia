import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GoalPayload } from '../../../application/validation/goalForm';
import { catalogService } from '../../../infrastructure/services/catalogService';
import { goalService } from '../../../infrastructure/services/goalService';

export function useGoalList(page: number, limit: number) {
  return useQuery({
    // Starts with 'goals', the prefix that a movement write already invalidates (it changes the progress).
    queryKey: ['goals', 'list', page, limit],
    queryFn: ({ signal }) => goalService.list({ page, limit }, signal),
    placeholderData: keepPreviousData,
  });
}

// Nothing else on screen depends on a goal today (the Panel only reads the movement summary), so only the goal lists
// refresh. If a later screen shows goals, give its query a key that starts with 'goals' and it refreshes here too.
function useInvalidateAfterWrite() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['goals'] });
}

export function useSaveGoal(editingId: string | null) {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: (payload: GoalPayload) => (editingId ? goalService.update(editingId, payload) : goalService.create(payload)),
    onSuccess: invalidate,
  });
}

export function useDeleteGoal() {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: (id: string) => goalService.remove(id),
    // Also after an error: a 404 means the goal is already gone, so the list must refresh.
    onSettled: invalidate,
  });
}

// Categories for the goal form and the table. Same key as the movement screen's select, so the cache is shared and a
// category change (which invalidates 'categories') refreshes both.
export function useCategoryOptions() {
  return useQuery({
    queryKey: ['categories', 'all'],
    queryFn: ({ signal }) => catalogService.listCategories(signal),
    staleTime: 60_000,
  });
}
