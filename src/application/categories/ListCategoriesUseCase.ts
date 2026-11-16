import type { Category } from '../../domain/entities/Category';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import { normalizePage, toPagedResult, type PagedResult, type PageParams } from '../pagination';

export class ListCategoriesUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(userId: string, params: PageParams = {}): Promise<PagedResult<Category>> {
    const { page, limit, pagination } = normalizePage(params);
    return toPagedResult(await this.categories.listVisibleTo(userId, pagination), page, limit);
  }
}
