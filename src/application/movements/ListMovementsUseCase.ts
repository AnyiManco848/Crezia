import type { Movement } from '../../domain/entities/Movement';
import type { MovementFilters, MovementRepository } from '../../domain/repositories/MovementRepository';

import { DEFAULT_PAGE, MAX_LIMIT, normalizePage } from '../pagination';

export { DEFAULT_PAGE, MAX_LIMIT };
export const DEFAULT_LIMIT = 20;

export interface ListMovementsInput extends MovementFilters {
  page?: number;
  limit?: number;
}

export interface MovementList {
  data: Movement[];
  page: number;
  limit: number;
  total: number;
}

export class ListMovementsUseCase {
  constructor(private readonly movements: MovementRepository) {}

  // The schema already applies the defaults and bounds; they are repeated so the use case is safe on its own.
  async execute({ page, limit, ...filters }: ListMovementsInput, userId: string): Promise<MovementList> {
    const { page: safePage, limit: safeLimit, pagination } = normalizePage({ page, limit }, DEFAULT_LIMIT);
    const { data, total } = await this.movements.listByUser(userId, filters, pagination);
    return { data, page: safePage, limit: safeLimit, total };
  }
}
