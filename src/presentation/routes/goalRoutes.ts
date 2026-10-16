import { Router } from 'express';
import type { TokenService } from '../../application/services';
import type { GoalController } from '../controllers/GoalController';
import { auth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { idParamsSchema } from '../schemas/commonSchemas';
import { createGoalBodySchema, updateGoalBodySchema } from '../schemas/goalSchemas';

export function goalRoutes(controller: GoalController, tokens: TokenService): Router {
  const router = Router();
  router.use(auth(tokens));

  router.get('/', controller.list);
  router.get('/:id', validate({ params: idParamsSchema }), controller.get);
  router.post('/', validate({ body: createGoalBodySchema }), controller.create);
  router.patch('/:id', validate({ params: idParamsSchema, body: updateGoalBodySchema }), controller.update);
  router.delete('/:id', validate({ params: idParamsSchema }), controller.delete);
  return router;
}
