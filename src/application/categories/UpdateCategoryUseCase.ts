import type { Category } from '../../domain/entities/Category';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import { findOwnedCategory } from './categoryAccess';

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
}

export class UpdateCategoryUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(id: string, { name, description }: UpdateCategoryInput, userId: string): Promise<Category> {
    await findOwnedCategory(this.categories, id, userId, 'Las categorías del sistema no se pueden editar');
    return this.categories.update(id, { name, description, updatedBy: userId });
  }
}
