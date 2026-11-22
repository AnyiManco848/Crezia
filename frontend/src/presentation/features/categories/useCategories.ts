import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryPayload } from '../../../application/validation/categoryForm';
import { categoryService } from '../../../infrastructure/services/categoryService';

export function useCategoryList(page: number, limit: number) {
  return useQuery({
    // Starts with 'categories' so the movement screen's select ('categories','all') refreshes with it.
    queryKey: ['categories', 'list', page, limit],
    queryFn: ({ signal }) => categoryService.list({ page, limit }, signal),
    placeholderData: keepPreviousData,
  });
}

// A category change also changes the names shown in movements and goals.
function useInvalidateAfterWrite() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['movements'] }),
      queryClient.invalidateQueries({ queryKey: ['goals'] }),
    ]);
}

export function useSaveCategory(editingId: string | null) {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: (payload: CategoryPayload) =>
      editingId ? categoryService.update(editingId, payload) : categoryService.create(payload),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: (id: string) => categoryService.remove(id),
    // Also after an error: a 404 means the category is already gone, so the list must refresh.
    onSettled: invalidate,
  });
}
