import type { Movement } from '../../domain/entities/Movement';
import type {
  CreateMovementData,
  MovementFilters,
  MovementPage,
  MovementRepository,
  MovementSummaryFilter,
  MovementTypeTotal,
  Pagination,
  SoftDeleteData,
  UpdateMovementData,
} from '../../domain/repositories/MovementRepository';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { softDeleteRow } from '../prisma/softDelete';

const movementSelect = {
  id: true,
  userId: true,
  bankAccountId: true,
  categoryId: true,
  type: true,
  amount: true,
  currencyCode: true,
  date: true,
  paymentMethod: true,
  source: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;

type MovementRow = Prisma.MovementGetPayload<{ select: typeof movementSelect }>;

// DATE columns travel as UTC midnight, so the calendar day is the ISO date part.
function toDbDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toMovement({ amount, date, ...row }: MovementRow): Movement {
  return { ...row, amount: amount.toFixed(2), date: date.toISOString().slice(0, 10) };
}

export class PrismaMovementRepository implements MovementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Movements of a deleted account are still listed: only the movement's own deleted_at counts.
  async listByUser(
    userId: string,
    { type, categoryId, bankAccountId, from, to }: MovementFilters,
    { skip, take }: Pagination,
  ): Promise<MovementPage> {
    const where: Prisma.MovementWhereInput = {
      userId,
      deletedAt: null,
      type,
      categoryId,
      bankAccountId,
      date: from || to ? { gte: from ? toDbDate(from) : undefined, lte: to ? toDbDate(to) : undefined } : undefined,
    };
    // Two independent reads: no transaction (BEGIN/COMMIT round trips) is needed for a page and its total.
    const [rows, total] = await Promise.all([
      this.prisma.movement.findMany({
        where,
        // created_at and id break ties inside the same day so pages are stable.
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        select: movementSelect,
      }),
      this.prisma.movement.count({ where }),
    ]);
    return { data: rows.map(toMovement), total };
  }

  // SELECT type, SUM(amount), COUNT(*) ... WHERE user_id, currency and date range, not deleted GROUP BY type.
  // One query, at most two rows; it uses idx_movements_user_date_active. Like listByUser, it keeps the
  // movements of a deleted account.
  async sumByTypeInPeriod(
    userId: string,
    { from, to, currencyCode }: MovementSummaryFilter,
  ): Promise<MovementTypeTotal[]> {
    const rows = await this.prisma.movement.groupBy({
      by: ['type'],
      where: { userId, deletedAt: null, currencyCode, date: { gte: toDbDate(from), lte: toDbDate(to) } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    return rows.map((row) => ({
      type: row.type,
      amount: row._sum.amount?.toFixed(2) ?? '0.00',
      count: row._count._all,
    }));
  }

  async findById(id: string): Promise<Movement | null> {
    const row = await this.prisma.movement.findFirst({
      where: { id, deletedAt: null },
      select: movementSelect,
    });
    return row ? toMovement(row) : null;
  }

  async create({ date, ...data }: CreateMovementData): Promise<Movement> {
    const row = await this.prisma.movement.create({
      data: { ...data, date: toDbDate(date) },
      select: movementSelect,
    });
    return toMovement(row);
  }

  async update(id: string, { date, ...data }: UpdateMovementData): Promise<Movement> {
    const row = await this.prisma.movement.update({
      where: { id, deletedAt: null },
      data: { ...data, date: date === undefined ? undefined : toDbDate(date) },
      select: movementSelect,
    });
    return toMovement(row);
  }

  softDelete(id: string, { deletedBy }: SoftDeleteData): Promise<void> {
    return softDeleteRow(this.prisma, 'movements', id, deletedBy);
  }
}
