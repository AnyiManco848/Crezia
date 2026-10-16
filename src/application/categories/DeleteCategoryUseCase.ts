import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import { findOwnedCategory } from './categoryAccess';

export class DeleteCategoryUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    await findOwnedCategory(this.categories, id, userId, 'Las categorías del sistema no se pueden eliminar');
    await this.categories.softDelete(id, { deletedBy: userId });
  }
}
