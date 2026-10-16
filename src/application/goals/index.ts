import type { CreateGoalUseCase } from './CreateGoalUseCase';
import type { DeleteGoalUseCase } from './DeleteGoalUseCase';
import type { GetGoalUseCase } from './GetGoalUseCase';
import type { ListGoalsUseCase } from './ListGoalsUseCase';
import type { UpdateGoalUseCase } from './UpdateGoalUseCase';

// Built by the container and consumed by the goal controller.
export interface GoalUseCases {
  list: ListGoalsUseCase;
  get: GetGoalUseCase;
  create: CreateGoalUseCase;
  update: UpdateGoalUseCase;
  delete: DeleteGoalUseCase;
}
