import type { Category } from '../../domain/entities/Category';
import type {
  CategoryRepository,
  CreateCategoryData,
  SoftDeleteData,
  UpdateCategoryData,
} from '../../domain/repositories/CategoryRepository';
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

  listVisibleTo(userId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { deletedAt: null, OR: [{ userId: null }, { userId }] },
      // System categories first, then the user's, each group by name.
      orderBy: [{ userId: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }],
      select: categorySelect,
    });
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
