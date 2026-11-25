import { Router, type RequestHandler } from 'express';
import type { GoalController } from '../controllers/GoalController';
import { validate } from '../middlewares/validate';
import { idParamsSchema, paginationQuerySchema } from '../schemas/commonSchemas';
import { createGoalBodySchema, updateGoalBodySchema } from '../schemas/goalSchemas';

export function goalRoutes(controller: GoalController, authenticate: RequestHandler): Router {
  const router = Router();
  router.use(authenticate);

  router.get('/', validate({ query: paginationQuerySchema }), controller.list);
  router.get('/:id', validate({ params: idParamsSchema }), controller.get);
  router.post('/', validate({ body: createGoalBodySchema }), controller.create);
  router.patch('/:id', validate({ params: idParamsSchema, body: updateGoalBodySchema }), controller.update);
  router.delete('/:id', validate({ params: idParamsSchema }), controller.delete);
  return router;
}
