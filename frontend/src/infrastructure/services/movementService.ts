import type { MovementSummary } from '../../domain/types';
import type { HttpClient } from '../http/client';
import { http } from '../http';

export interface SummaryParams {
  from: string;
  to: string;
  // The API defaults to COP.
  currencyCode?: string;
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
  };
}

export const movementService = createMovementService(http);
