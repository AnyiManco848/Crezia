import type { Request, Response } from 'express';
import type { CategoryUseCases } from '../../application/categories';
import type { CreateCategoryBody, UpdateCategoryBody } from '../schemas/categorySchemas';
import type { IdParams } from '../schemas/commonSchemas';

// Every route runs behind the auth middleware, so req.user is always set.
export class CategoryController {
  constructor(private readonly useCases: CategoryUseCases) {}

  list = async (req: Request, res: Response) => {
    res.json(await this.useCases.list.execute(req.user!.id));
  };

  get = async (req: Request<IdParams>, res: Response) => {
    res.json(await this.useCases.get.execute(req.params.id, req.user!.id));
  };

  create = async (req: Request<unknown, unknown, CreateCategoryBody>, res: Response) => {
    res.status(201).json(await this.useCases.create.execute(req.body, req.user!.id));
  };

  update = async (req: Request<IdParams, unknown, UpdateCategoryBody>, res: Response) => {
    res.json(await this.useCases.update.execute(req.params.id, req.body, req.user!.id));
  };

  delete = async (req: Request<IdParams>, res: Response) => {
    await this.useCases.delete.execute(req.params.id, req.user!.id);
    res.status(204).end();
  };
}
