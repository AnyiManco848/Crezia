import { randomUUID } from 'node:crypto';
import type { Movement } from '../../src/domain/entities/Movement';
import type {
  CreateMovementData,
  MovementFilters,
  MovementPage,
  MovementRepository,
  Pagination,
  SoftDeleteData,
  UpdateMovementData,
} from '../../src/domain/repositories/MovementRepository';

export interface StoredMovement extends Movement {
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
}

// Mirrors the PrismaMovementRepository contract over an array, so use cases run without a database.
export class InMemoryMovementRepository implements MovementRepository {
  readonly rows: StoredMovement[] = [];

  seed(movement: Partial<StoredMovement> & Pick<Movement, 'userId' | 'categoryId'>): StoredMovement {
    const row: StoredMovement = {
      id: randomUUID(),
      bankAccountId: null,
      type: 'Expense',
      amount: '1000.00',
      currencyCode: 'COP',
      date: '2026-10-01',
      paymentMethod: 'Cash',
      source: 'Manual',
      description: null,
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
      createdBy: null,
      updatedBy: null,
      deletedAt: null,
      deletedBy: null,
      ...movement,
    };
    this.rows.push(row);
    return row;
  }

  // Same order as the real repository: date, then creation, newest first.
  async listByUser(userId: string, filters: MovementFilters, { skip, take }: Pagination): Promise<MovementPage> {
    const matching = this.rows
      .filter(
        (r) =>
          !r.deletedAt &&
          r.userId === userId &&
          (filters.type === undefined || r.type === filters.type) &&
          (filters.categoryId === undefined || r.categoryId === filters.categoryId) &&
          (filters.bankAccountId === undefined || r.bankAccountId === filters.bankAccountId) &&
          (filters.from === undefined || r.date >= filters.from) &&
          (filters.to === undefined || r.date <= filters.to),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.getTime() - a.createdAt.getTime());
    return { data: matching.slice(skip, skip + take).map(toPublic), total: matching.length };
  }

  async findById(id: string): Promise<Movement | null> {
    const row = this.active(id);
    return row ? toPublic(row) : null;
  }

  async create(data: CreateMovementData): Promise<Movement> {
    return toPublic(this.seed(data));
  }

  async update(id: string, data: UpdateMovementData): Promise<Movement> {
    const row = this.active(id)!;
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) Object.assign(row, { [key]: value });
    }
    return toPublic(row);
  }

  // new Date() stands in for the database now() used by the real repository.
  async softDelete(id: string, { deletedBy }: SoftDeleteData): Promise<void> {
    Object.assign(this.active(id)!, { deletedAt: new Date(), deletedBy, updatedBy: deletedBy });
  }

  private active(id: string): StoredMovement | undefined {
    return this.rows.find((r) => r.id === id && !r.deletedAt);
  }
}

function toPublic(row: StoredMovement): Movement {
  const { createdBy: _c, updatedBy: _u, deletedAt: _da, deletedBy: _db, ...movement } = row;
  return movement;
}
