import type { Category } from '../entities/Category';

export interface CreateCategoryData {
  userId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string | null;
  updatedBy: string;
}

// deleted_at is not sent: the repository takes it from the database clock.
export interface SoftDeleteData {
  deletedBy: string;
}

// Every read ignores soft-deleted categories.
export interface CategoryRepository {
  // System categories (userId null) plus the ones owned by userId.
  listVisibleTo(userId: string): Promise<Category[]>;
  // Any owner; access rules are applied by the use cases.
  findById(id: string): Promise<Category | null>;
  create(data: CreateCategoryData): Promise<Category>;
  update(id: string, data: UpdateCategoryData): Promise<Category>;
  softDelete(id: string, data: SoftDeleteData): Promise<void>;
}
