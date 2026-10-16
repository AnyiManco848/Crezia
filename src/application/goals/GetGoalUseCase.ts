import type { GoalWithProgress } from '../../domain/entities/Goal';
import type { GoalRepository } from '../../domain/repositories/GoalRepository';
import { findOwnedGoal, withGoalProgress } from './goalAccess';

export class GetGoalUseCase {
  constructor(private readonly goals: GoalRepository) {}

  async execute(id: string, userId: string): Promise<GoalWithProgress> {
    const goal = await findOwnedGoal(this.goals, id, userId);
    return withGoalProgress(this.goals, goal);
  }
}
