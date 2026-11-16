import type { Request, Response } from 'express';
import type { CategoryUseCases } from '../../application/categories';
import type { CreateCategoryBody, UpdateCategoryBody } from '../schemas/categorySchemas';
import type { IdParams, PaginationQuery } from '../schemas/commonSchemas';
import { sendPage } from '../http/paginationHeaders';

// Every route runs behind the auth middleware, so req.user is always set.
export class CategoryController {
  constructor(private readonly useCases: CategoryUseCases) {}

  // req.query was replaced by the parsed query in the validate middleware.
  list = async (req: Request, res: Response) => {
    sendPage(res, await this.useCases.list.execute(req.user!.id, req.query as unknown as PaginationQuery));
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
    res.status(200).json({ message: "Categoría eliminada con éxito" }).end();
    
  };
}
