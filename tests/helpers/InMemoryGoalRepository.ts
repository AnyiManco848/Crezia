import type { Page, Pagination } from '../../src/domain/pagination';
import { randomUUID } from 'node:crypto';
import { isGoalContribution, type ContributionEntry } from '../../src/application/goals/progress';
import { fromCents, toCents } from '../../src/application/money';
import { isActiveGoalStatus, type Goal } from '../../src/domain/entities/Goal';
import type {
  CreateGoalData,
  GoalRepository,
  GoalTotal,
  SoftDeleteData,
  UpdateGoalData,
} from '../../src/domain/repositories/GoalRepository';

export interface StoredGoal extends Goal {
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
}

// Mirrors the PrismaGoalRepository contract over arrays, so use cases run without a database.
export class InMemoryGoalRepository implements GoalRepository {
  readonly rows: StoredGoal[] = [];
  readonly movements: ContributionEntry[] = [];
  sumCalls = 0;

  seed(goal: Partial<StoredGoal> & Pick<Goal, 'userId' | 'categoryId'>): StoredGoal {
    const row: StoredGoal = {
      id: randomUUID(),
      name: 'Viaje',
      reason: 'Travel',
      reasonOther: null,
      targetAmount: '2000000.00',
      currencyCode: 'COP',
      startDate: '2026-10-01',
      endDate: '2027-04-01',
      status: 'Active',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
      createdBy: null,
      updatedBy: null,
      deletedAt: null,
      deletedBy: null,
      ...goal,
    };
    this.rows.push(row);
    return row;
  }

  addMovement(entry: ContributionEntry): void {
    this.movements.push(entry);
  }

  async listByUser(userId: string, { skip, take }: Pagination): Promise<Page<Goal>> {
    const all = this.rows.filter((r) => !r.deletedAt && r.userId === userId);
    return { data: all.slice(skip, skip + take).map(toPublic), total: all.length };
  }

  async findById(id: string): Promise<Goal | null> {
    const row = this.active(id);
    return row ? toPublic(row) : null;
  }

  async create(data: CreateGoalData): Promise<Goal> {
    return toPublic(this.seed(data));
  }

  async update(id: string, data: UpdateGoalData): Promise<Goal> {
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

  async existsActiveInCategory(userId: string, categoryId: string, excludeId?: string): Promise<boolean> {
    return this.rows.some(
      (r) =>
        !r.deletedAt &&
        r.userId === userId &&
        r.categoryId === categoryId &&
        isActiveGoalStatus(r.status) &&
        r.id !== excludeId,
    );
  }

  // Same shape as the SQL query: one row per goal with contributions.
  async sumContributions(goalIds: string[]): Promise<GoalTotal[]> {
    this.sumCalls++;
    const totals: GoalTotal[] = [];
    for (const goal of this.rows.filter((r) => goalIds.includes(r.id))) {
      const matching = this.movements.filter((m) => isGoalContribution(goal, m));
      if (matching.length === 0) continue;
      const cents = matching.reduce((sum, m) => sum + toCents(m.amount), 0);
      totals.push({ goalId: goal.id, amount: fromCents(cents) });
    }
    return totals;
  }

  private active(id: string): StoredGoal | undefined {
    return this.rows.find((r) => r.id === id && !r.deletedAt);
  }
}

function toPublic(row: StoredGoal): Goal {
  const { createdBy: _c, updatedBy: _u, deletedAt: _da, deletedBy: _db, ...goal } = row;
  return goal;
}
