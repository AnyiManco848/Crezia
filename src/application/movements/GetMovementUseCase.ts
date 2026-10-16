import type { Movement } from '../../domain/entities/Movement';
import type { MovementRepository } from '../../domain/repositories/MovementRepository';
import { findOwnedMovement } from './movementAccess';

export class GetMovementUseCase {
  constructor(private readonly movements: MovementRepository) {}

  execute(id: string, userId: string): Promise<Movement> {
    return findOwnedMovement(this.movements, id, userId);
  }
}
