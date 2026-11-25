import { Router, type RequestHandler } from 'express';
import type { CategoryController } from '../controllers/CategoryController';
import { validate } from '../middlewares/validate';
import { createCategoryBodySchema, updateCategoryBodySchema } from '../schemas/categorySchemas';
import { idParamsSchema, paginationQuerySchema } from '../schemas/commonSchemas';

export function categoryRoutes(controller: CategoryController, authenticate: RequestHandler): Router {
  const router = Router();
  router.use(authenticate);

  router.get('/', validate({ query: paginationQuerySchema }), controller.list);
  router.get('/:id', validate({ params: idParamsSchema }), controller.get);
  router.post('/', validate({ body: createCategoryBodySchema }), controller.create);
  router.patch('/:id', validate({ params: idParamsSchema, body: updateCategoryBodySchema }), controller.update);
  router.delete('/:id', validate({ params: idParamsSchema }), controller.delete);
  return router;
}
