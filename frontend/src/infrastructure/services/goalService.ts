import type { GoalPayload } from '../../application/validation/goalForm';
import type { Goal } from '../../domain/types';
import type { HttpClient } from '../http/client';
import { http } from '../http';
import { pageFromHeaders, type Page } from '../http/pagination';

export interface ListGoalsParams {
  page: number;
  limit: number;
}

export function createGoalService(client: HttpClient) {
  return {
    // GET /api/goals -> an array of goals WITH their computed progress; the pagination travels in the
    // X-Total-Count, X-Page and X-Limit headers.
    async list({ page, limit }: ListGoalsParams, signal?: AbortSignal): Promise<Page<Goal>> {
      return pageFromHeaders(await client.get<Goal[]>('/api/goals', { query: { page, limit }, signal }));
    },

    async create(payload: GoalPayload): Promise<Goal> {
      return (await client.post<Goal>('/api/goals', payload)).data;
    },

    async update(id: string, payload: GoalPayload): Promise<Goal> {
      return (await client.patch<Goal>(`/api/goals/${encodeURIComponent(id)}`, payload)).data;
    },

    // Soft delete: the movements of the goal's category are not touched.
    async remove(id: string): Promise<void> {
      await client.delete(`/api/goals/${encodeURIComponent(id)}`);
    },
  };
}

export const goalService = createGoalService(http);
