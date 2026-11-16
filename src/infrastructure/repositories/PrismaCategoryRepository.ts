import type { Category } from '../../domain/entities/Category';
import type {
  CategoryRepository,
  CreateCategoryData,
  SoftDeleteData,
  UpdateCategoryData,
} from '../../domain/repositories/CategoryRepository';
import type { Page, Pagination } from '../../domain/pagination';
import type { PrismaClient } from '../../generated/prisma/client';
import { softDeleteRow } from '../prisma/softDelete';

const categorySelect = {
  id: true,
  userId: true,
  name: true,
  description: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listVisibleTo(userId: string, { skip, take }: Pagination): Promise<Page<Category>> {
    const where = { deletedAt: null, OR: [{ userId: null }, { userId }] };
    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        // System categories first, then the user's, each group by name; id breaks ties so pages are stable.
        orderBy: [{ userId: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }, { id: 'asc' }],
        skip,
        take,
        select: categorySelect,
      }),
      this.prisma.category.count({ where }),
    ]);
    return { data, total };
  }

  findById(id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: categorySelect,
    });
  }

  create(data: CreateCategoryData): Promise<Category> {
    return this.prisma.category.create({ data, select: categorySelect });
  }

  update(id: string, data: UpdateCategoryData): Promise<Category> {
    return this.prisma.category.update({
      where: { id, deletedAt: null },
      data,
      select: categorySelect,
    });
  }

  softDelete(id: string, { deletedBy }: SoftDeleteData): Promise<void> {
    return softDeleteRow(this.prisma, 'categories', id, deletedBy);
  }
}
