import type { CategoryPayload } from '../../application/validation/categoryForm';
import type { Category } from '../../domain/types';
import type { HttpClient } from '../http/client';
import { http } from '../http';
import { pageFromHeaders, type Page } from '../http/pagination';

export interface ListCategoriesParams {
  page: number;
  limit: number;
}

export function createCategoryService(client: HttpClient) {
  return {
    // GET /api/categories -> an array; the pagination travels in X-Total-Count, X-Page and X-Limit.
    async list({ page, limit }: ListCategoriesParams, signal?: AbortSignal): Promise<Page<Category>> {
      return pageFromHeaders(await client.get<Category[]>('/api/categories', { query: { page, limit }, signal }));
    },

    async create(payload: CategoryPayload): Promise<Category> {
      return (await client.post<Category>('/api/categories', payload)).data;
    },

    async update(id: string, payload: CategoryPayload): Promise<Category> {
      return (await client.patch<Category>(`/api/categories/${encodeURIComponent(id)}`, payload)).data;
    },

    // Soft delete: the movements and goals that used the category are kept.
    async remove(id: string): Promise<void> {
      await client.delete(`/api/categories/${encodeURIComponent(id)}`);
    },
  };
}

export const categoryService = createCategoryService(http);
