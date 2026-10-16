import type { CreateCategoryUseCase } from './CreateCategoryUseCase';
import type { DeleteCategoryUseCase } from './DeleteCategoryUseCase';
import type { GetCategoryUseCase } from './GetCategoryUseCase';
import type { ListCategoriesUseCase } from './ListCategoriesUseCase';
import type { UpdateCategoryUseCase } from './UpdateCategoryUseCase';

// Built by the container and consumed by the category controller.
export interface CategoryUseCases {
  list: ListCategoriesUseCase;
  get: GetCategoryUseCase;
  create: CreateCategoryUseCase;
  update: UpdateCategoryUseCase;
  delete: DeleteCategoryUseCase;
}
