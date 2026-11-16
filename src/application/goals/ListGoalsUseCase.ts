import type { GoalWithProgress } from '../../domain/entities/Goal';
import type { GoalRepository } from '../../domain/repositories/GoalRepository';
import { normalizePage, toPagedResult, type PagedResult, type PageParams } from '../pagination';
import { withProgress } from './progress';

export class ListGoalsUseCase {
  constructor(private readonly goals: GoalRepository) {}

  // Three queries in total, whatever the number of goals: a page of goals, their total
  // and the grouped contributions of that page only.
  async execute(userId: string, params: PageParams = {}): Promise<PagedResult<GoalWithProgress>> {
    const { page, limit, pagination } = normalizePage(params);
    const { data: goals, total } = await this.goals.listByUser(userId, pagination);
    if (goals.length === 0) return toPagedResult({ data: [], total }, page, limit);
    const totals = await this.goals.sumContributions(goals.map((g) => g.id));
    return toPagedResult({ data: withProgress(goals, totals), total }, page, limit);
  }
}
