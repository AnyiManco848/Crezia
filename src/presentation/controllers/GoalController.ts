import type { Request, Response } from 'express';
import type { GoalUseCases } from '../../application/goals';
import type { IdParams, PaginationQuery } from '../schemas/commonSchemas';
import type { CreateGoalBody, UpdateGoalBody } from '../schemas/goalSchemas';
import { sendPage } from '../http/paginationHeaders';

export const GOAL_DELETED_MESSAGE = 'Meta eliminada con éxito';

// Every route runs behind the auth middleware, so req.user is always set.
export class GoalController {
  constructor(private readonly useCases: GoalUseCases) {}

  // req.query was replaced by the parsed query in the validate middleware.
  list = async (req: Request, res: Response) => {
    sendPage(res, await this.useCases.list.execute(req.user!.id, req.query as unknown as PaginationQuery));
  };

  get = async (req: Request<IdParams>, res: Response) => {
    res.json(await this.useCases.get.execute(req.params.id, req.user!.id));
  };

  create = async (req: Request<unknown, unknown, CreateGoalBody>, res: Response) => {
    res.status(201).json(await this.useCases.create.execute(req.body, req.user!.id));
  };

  update = async (req: Request<IdParams, unknown, UpdateGoalBody>, res: Response) => {
    res.json(await this.useCases.update.execute(req.params.id, req.body, req.user!.id));
  };

  // Unlike the other resources, goals answer 200 with a confirmation message.
  delete = async (req: Request<IdParams>, res: Response) => {
    await this.useCases.delete.execute(req.params.id, req.user!.id);
    res.json({ message: GOAL_DELETED_MESSAGE });
  };
}
