import type { Page, Pagination } from '../../src/domain/pagination';
import { randomUUID } from 'node:crypto';
import type { Category } from '../../src/domain/entities/Category';
import type {
  CategoryRepository,
  CreateCategoryData,
  SoftDeleteData,
  UpdateCategoryData,
} from '../../src/domain/repositories/CategoryRepository';

export interface StoredCategory extends Category {
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
}

// Mirrors the PrismaCategoryRepository contract over an array, so use cases run without a database.
export class InMemoryCategoryRepository implements CategoryRepository {
  readonly rows: StoredCategory[] = [];

  seed(category: Partial<StoredCategory> & Pick<Category, 'name'>): StoredCategory {
    const row: StoredCategory = {
      id: randomUUID(),
      userId: null,
      description: null,
      isDefault: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: null,
      updatedBy: null,
      deletedAt: null,
      deletedBy: null,
      ...category,
    };
    this.rows.push(row);
    return row;
  }

  async listVisibleTo(userId: string, { skip, take }: Pagination): Promise<Page<Category>> {
    const all = this.rows.filter((r) => !r.deletedAt && (r.userId === null || r.userId === userId));
    return { data: all.slice(skip, skip + take).map(toPublic), total: all.length };
  }

  async findById(id: string): Promise<Category | null> {
    const row = this.active(id);
    return row ? toPublic(row) : null;
  }

  async create(data: CreateCategoryData): Promise<Category> {
    return toPublic(this.seed(data));
  }

  async update(id: string, data: UpdateCategoryData): Promise<Category> {
    const row = this.active(id)!;
    if (data.name !== undefined) row.name = data.name;
    if (data.description !== undefined) row.description = data.description;
    row.updatedBy = data.updatedBy;
    return toPublic(row);
  }

  // new Date() stands in for the database now() used by the real repository.
  async softDelete(id: string, { deletedBy }: SoftDeleteData): Promise<void> {
    Object.assign(this.active(id)!, { deletedAt: new Date(), deletedBy, updatedBy: deletedBy });
  }

  private active(id: string): StoredCategory | undefined {
    return this.rows.find((r) => r.id === id && !r.deletedAt);
  }
}

function toPublic(row: StoredCategory): Category {
  const { createdBy: _c, updatedBy: _u, deletedAt: _da, deletedBy: _db, ...category } = row;
  return category;
}
