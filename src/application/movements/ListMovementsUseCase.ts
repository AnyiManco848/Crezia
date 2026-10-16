import type { Movement } from '../../domain/entities/Movement';
import type { MovementFilters, MovementRepository } from '../../domain/repositories/MovementRepository';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

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
    const safePage = Math.max(DEFAULT_PAGE, Math.trunc(page ?? DEFAULT_PAGE));
    const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit ?? DEFAULT_LIMIT)));
    const { data, total } = await this.movements.listByUser(userId, filters, {
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return { data, page: safePage, limit: safeLimit, total };
  }
}
