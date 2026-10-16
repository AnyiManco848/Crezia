import type { Category } from '../../domain/entities/Category';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';

export class ListCategoriesUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  execute(userId: string): Promise<Category[]> {
    return this.categories.listVisibleTo(userId);
  }
}
