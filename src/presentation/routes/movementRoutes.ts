import { Router } from 'express';
import type { TokenService } from '../../application/services';
import type { MovementController } from '../controllers/MovementController';
import { auth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { idParamsSchema } from '../schemas/commonSchemas';
import {
  createMovementBodySchema,
  listMovementsQuerySchema,
  updateMovementBodySchema,
} from '../schemas/movementSchemas';

export function movementRoutes(controller: MovementController, tokens: TokenService): Router {
  const router = Router();
  router.use(auth(tokens));

  router.get('/', validate({ query: listMovementsQuerySchema }), controller.list);
  router.get('/:id', validate({ params: idParamsSchema }), controller.get);
  router.post('/', validate({ body: createMovementBodySchema }), controller.create);
  router.patch('/:id', validate({ params: idParamsSchema, body: updateMovementBodySchema }), controller.update);
  router.delete('/:id', validate({ params: idParamsSchema }), controller.delete);
  return router;
}
