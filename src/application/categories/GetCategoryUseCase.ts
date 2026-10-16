import type { Category } from '../../domain/entities/Category';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import { findVisibleCategory } from './categoryAccess';

export class GetCategoryUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  execute(id: string, userId: string): Promise<Category> {
    return findVisibleCategory(this.categories, id, userId);
  }
}
