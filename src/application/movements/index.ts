import type { CreateMovementUseCase } from './CreateMovementUseCase';
import type { DeleteMovementUseCase } from './DeleteMovementUseCase';
import type { GetMovementSummaryUseCase } from './GetMovementSummaryUseCase';
import type { GetMovementUseCase } from './GetMovementUseCase';
import type { ListMovementsUseCase } from './ListMovementsUseCase';
import type { UpdateMovementUseCase } from './UpdateMovementUseCase';

// Built by the container and consumed by the movement controller.
export interface MovementUseCases {
  list: ListMovementsUseCase;
  summary: GetMovementSummaryUseCase;
  get: GetMovementUseCase;
  create: CreateMovementUseCase;
  update: UpdateMovementUseCase;
  delete: DeleteMovementUseCase;
}
