import { Router, type RequestHandler } from 'express';
import type { MovementController } from '../controllers/MovementController';
import { validate } from '../middlewares/validate';
import { idParamsSchema } from '../schemas/commonSchemas';
import {
  createMovementBodySchema,
  listMovementsQuerySchema,
  movementSummaryQuerySchema,
  updateMovementBodySchema,
} from '../schemas/movementSchemas';

export function movementRoutes(controller: MovementController, authenticate: RequestHandler): Router {
  const router = Router();
  router.use(authenticate);

  router.get('/', validate({ query: listMovementsQuerySchema }), controller.list);
  // Declared before '/:id': otherwise Express would take "summary" as an id and answer 400 (invalid UUID).
  router.get('/summary', validate({ query: movementSummaryQuerySchema }), controller.summary);
  router.get('/:id', validate({ params: idParamsSchema }), controller.get);
  router.post('/', validate({ body: createMovementBodySchema }), controller.create);
  router.patch('/:id', validate({ params: idParamsSchema, body: updateMovementBodySchema }), controller.update);
  router.delete('/:id', validate({ params: idParamsSchema }), controller.delete);
  return router;
}
