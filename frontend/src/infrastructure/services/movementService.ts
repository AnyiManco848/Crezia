import type { MovementPayload } from '../../application/validation/movementForm';
import type { MovementFilters } from '../../domain/movementFilters';
import type { Movement, MovementSummary } from '../../domain/types';
import type { HttpClient } from '../http/client';
import { http } from '../http';
import { pageFromBody, type BodyPage, type Page } from '../http/pagination';

export interface SummaryParams {
  from: string;
  to: string;
  // The API defaults to COP.
  currencyCode?: string;
}

export interface ListMovementsParams {
  filters: MovementFilters;
  page: number;
  limit: number;
}

export function createMovementService(client: HttpClient) {
  return {
    // GET /api/movements/summary?from=&to=&currencyCode= -> totals of the whole period (not of one page).
    async getSummary({ from, to, currencyCode }: SummaryParams, signal?: AbortSignal): Promise<MovementSummary> {
      const response = await client.get<MovementSummary>('/api/movements/summary', {
        query: { from, to, currencyCode },
        signal,
      });
      return response.data;
    },

    // GET /api/movements -> { data, page, limit, total } in the body (the other lists use headers).
    async list({ filters, page, limit }: ListMovementsParams, signal?: AbortSignal): Promise<Page<Movement>> {
      const response = await client.get<BodyPage<Movement>>('/api/movements', {
        query: { ...filters, page, limit },
        signal,
      });
      return pageFromBody(response);
    },

    async create(payload: MovementPayload): Promise<Movement> {
      return (await client.post<Movement>('/api/movements', payload)).data;
    },

    async update(id: string, payload: MovementPayload): Promise<Movement> {
      return (await client.patch<Movement>(`/api/movements/${encodeURIComponent(id)}`, payload)).data;
    },

    // Soft delete on the API: the movement disappears from the lists and from every total.
    async remove(id: string): Promise<void> {
      await client.delete(`/api/movements/${encodeURIComponent(id)}`);
    },
  };
}

export const movementService = createMovementService(http);
