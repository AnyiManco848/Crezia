import type { GoalWithProgress } from '../../domain/entities/Goal';
import type { GoalRepository } from '../../domain/repositories/GoalRepository';
import { withProgress } from './progress';

export class ListGoalsUseCase {
  constructor(private readonly goals: GoalRepository) {}

  // Two queries in total, whatever the number of goals: the goals and their grouped contributions.
  async execute(userId: string): Promise<GoalWithProgress[]> {
    const goals = await this.goals.listByUser(userId);
    if (goals.length === 0) return [];
    const totals = await this.goals.sumContributions(goals.map((g) => g.id));
    return withProgress(goals, totals);
  }
}
