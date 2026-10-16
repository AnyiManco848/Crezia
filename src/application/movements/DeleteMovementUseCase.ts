import type { MovementRepository } from '../../domain/repositories/MovementRepository';
import { findOwnedMovement } from './movementAccess';

export class DeleteMovementUseCase {
  constructor(private readonly movements: MovementRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    await findOwnedMovement(this.movements, id, userId);
    await this.movements.softDelete(id, { deletedBy: userId });
  }
}
