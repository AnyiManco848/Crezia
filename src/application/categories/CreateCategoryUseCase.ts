import type { Category } from '../../domain/entities/Category';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
}

export class CreateCategoryUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  // Only the explicit fields are copied: a user category is never default,
  // whatever the caller sends.
  execute({ name, description }: CreateCategoryInput, userId: string): Promise<Category> {
    return this.categories.create({
      userId,
      name,
      description: description ?? null,
      isDefault: false,
      createdBy: userId,
      updatedBy: userId,
    });
  }
}
