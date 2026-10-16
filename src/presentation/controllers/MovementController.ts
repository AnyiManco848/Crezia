import type { Request, Response } from 'express';
import type { MovementUseCases } from '../../application/movements';
import type { IdParams } from '../schemas/commonSchemas';
import type { CreateMovementBody, ListMovementsQuery, UpdateMovementBody } from '../schemas/movementSchemas';

// Every route runs behind the auth middleware, so req.user is always set.
export class MovementController {
  constructor(private readonly useCases: MovementUseCases) {}

  // req.query was replaced by the parsed query in the validate middleware.
  list = async (req: Request, res: Response) => {
    res.json(await this.useCases.list.execute(req.query as unknown as ListMovementsQuery, req.user!.id));
  };

  get = async (req: Request<IdParams>, res: Response) => {
    res.json(await this.useCases.get.execute(req.params.id, req.user!.id));
  };

  create = async (req: Request<unknown, unknown, CreateMovementBody>, res: Response) => {
    res.status(201).json(await this.useCases.create.execute(req.body, req.user!.id));
  };

  update = async (req: Request<IdParams, unknown, UpdateMovementBody>, res: Response) => {
    res.json(await this.useCases.update.execute(req.params.id, req.body, req.user!.id));
  };

  delete = async (req: Request<IdParams>, res: Response) => {
    await this.useCases.delete.execute(req.params.id, req.user!.id);
    res.status(200).json({ message: "Movimiento eliminado con éxito" });
  };
}
