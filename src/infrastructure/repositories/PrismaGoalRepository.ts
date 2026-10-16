import { ACTIVE_GOAL_CONFLICT_MESSAGE } from '../../application/goals/goalAccess';
import { ACTIVE_GOAL_STATUSES, type Goal } from '../../domain/entities/Goal';
import { ConflictError } from '../../domain/errors';
import type {
  CreateGoalData,
  GoalRepository,
  GoalTotal,
  SoftDeleteData,
  UpdateGoalData,
} from '../../domain/repositories/GoalRepository';
import { Prisma, type PrismaClient } from '../../generated/prisma/client';
import { softDeleteRow } from '../prisma/softDelete';

const goalSelect = {
  id: true,
  userId: true,
  categoryId: true,
  name: true,
  reason: true,
  reasonOther: true,
  targetAmount: true,
  currencyCode: true,
  startDate: true,
  endDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

type GoalRow = Prisma.GoalGetPayload<{ select: typeof goalSelect }>;

// DATE columns travel as UTC midnight, so the calendar day is the ISO date part.
function toDbDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toGoal({ targetAmount, startDate, endDate, ...row }: GoalRow): Goal {
  return { ...row, targetAmount: targetAmount.toFixed(2), startDate: fromDbDate(startDate), endDate: fromDbDate(endDate) };
}

// The use cases check uq_goals_active_category first; this covers two concurrent requests.
async function withActiveGoalConflict<T>(write: Promise<T>): Promise<T> {
  try {
    return await write;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError(ACTIVE_GOAL_CONFLICT_MESSAGE);
    }
    throw err;
  }
}

export class PrismaGoalRepository implements GoalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listByUser(userId: string): Promise<Goal[]> {
    const rows = await this.prisma.goal.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ endDate: 'asc' }, { createdAt: 'asc' }],
      select: goalSelect,
    });
    return rows.map(toGoal);
  }

  async findById(id: string): Promise<Goal | null> {
    const row = await this.prisma.goal.findFirst({
      where: { id, deletedAt: null },
      select: goalSelect,
    });
    return row ? toGoal(row) : null;
  }

  async create({ startDate, endDate, ...data }: CreateGoalData): Promise<Goal> {
    const row = await withActiveGoalConflict(
      this.prisma.goal.create({
        data: { ...data, startDate: toDbDate(startDate), endDate: toDbDate(endDate) },
        select: goalSelect,
      }),
    );
    return toGoal(row);
  }

  async update(id: string, { startDate, endDate, ...data }: UpdateGoalData): Promise<Goal> {
    const row = await withActiveGoalConflict(
      this.prisma.goal.update({
        where: { id, deletedAt: null },
        data: {
          ...data,
          startDate: startDate === undefined ? undefined : toDbDate(startDate),
          endDate: endDate === undefined ? undefined : toDbDate(endDate),
        },
        select: goalSelect,
      }),
    );
    return toGoal(row);
  }

  softDelete(id: string, { deletedBy }: SoftDeleteData): Promise<void> {
    return softDeleteRow(this.prisma, 'goals', id, deletedBy);
  }

  async existsActiveInCategory(userId: string, categoryId: string, excludeId?: string): Promise<boolean> {
    const goal = await this.prisma.goal.findFirst({
      where: {
        userId,
        categoryId,
        deletedAt: null,
        status: { in: [...ACTIVE_GOAL_STATUSES] },
        id: excludeId ? { not: excludeId } : undefined,
      },
      select: { id: true },
    });
    return goal !== null;
  }

  // Each goal has its own category and date range, which groupBy cannot express, so one SQL
  // query joins goals with movements. Same rule as isGoalContribution in application/goals/progress.ts.
  async sumContributions(goalIds: string[]): Promise<GoalTotal[]> {
    if (goalIds.length === 0) return [];
    const rows = await this.prisma.$queryRaw<{ goal_id: string; amount: string }[]>`
      SELECT g.id::text AS goal_id, SUM(m.amount)::text AS amount
      FROM goals g
      JOIN movements m
        ON m.user_id = g.user_id
       AND m.category_id = g.category_id
       AND m.type = 'Expense'
       AND m.deleted_at IS NULL
       AND m.date BETWEEN g.start_date AND g.end_date
      WHERE g.id = ANY(${goalIds}::uuid[])
      GROUP BY g.id`;
    return rows.map((row) => ({ goalId: row.goal_id, amount: row.amount }));
  }
}
