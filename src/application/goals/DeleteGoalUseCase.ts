import type { GoalRepository } from '../../domain/repositories/GoalRepository';
import { findOwnedGoal } from './goalAccess';

// The movements that counted toward the goal are left untouched.
export class DeleteGoalUseCase {
  constructor(private readonly goals: GoalRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    await findOwnedGoal(this.goals, id, userId);
    await this.goals.softDelete(id, { deletedBy: userId });
  }
}
