import { isSystemCategory, type Category } from '../../domain/entities/Category';
import { ForbiddenError, NotFoundError } from '../../domain/errors';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';

export const CATEGORY_NOT_FOUND_MESSAGE = 'Categoría no encontrada';

// A category is visible when it is a system one or belongs to the user.
// Another user's category answers 404 so its existence is not revealed.
export async function findVisibleCategory(
  categories: CategoryRepository,
  id: string,
  userId: string,
): Promise<Category> {
  const category = await categories.findById(id);
  if (!category || (!isSystemCategory(category) && category.userId !== userId)) {
    throw new NotFoundError(CATEGORY_NOT_FOUND_MESSAGE);
  }
  return category;
}

// Same as findVisibleCategory, but system categories are read-only (403).
export async function findOwnedCategory(
  categories: CategoryRepository,
  id: string,
  userId: string,
  forbiddenMessage: string,
): Promise<Category> {
  const category = await findVisibleCategory(categories, id, userId);
  if (isSystemCategory(category)) throw new ForbiddenError(forbiddenMessage);
  return category;
}
