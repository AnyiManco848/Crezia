import { Router } from 'express';
import type { TokenService } from '../../application/services';
import type { CategoryController } from '../controllers/CategoryController';
import { auth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createCategoryBodySchema, updateCategoryBodySchema } from '../schemas/categorySchemas';
import { idParamsSchema } from '../schemas/commonSchemas';

export function categoryRoutes(controller: CategoryController, tokens: TokenService): Router {
  const router = Router();
  router.use(auth(tokens));

  router.get('/', controller.list);
  router.get('/:id', validate({ params: idParamsSchema }), controller.get);
  router.post('/', validate({ body: createCategoryBodySchema }), controller.create);
  router.put('/:id', validate({ params: idParamsSchema, body: updateCategoryBodySchema }), controller.update);
  router.delete('/:id', validate({ params: idParamsSchema }), controller.delete);
  return router;
}
