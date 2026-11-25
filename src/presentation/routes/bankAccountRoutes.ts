import { Router, type RequestHandler } from 'express';
import type { BankAccountController } from '../controllers/BankAccountController';
import { validate } from '../middlewares/validate';
import { createBankAccountBodySchema, updateBankAccountBodySchema } from '../schemas/bankAccountSchemas';
import { idParamsSchema, paginationQuerySchema } from '../schemas/commonSchemas';

export function bankAccountRoutes(controller: BankAccountController, authenticate: RequestHandler): Router {
  const router = Router();
  router.use(authenticate);

  router.get('/', validate({ query: paginationQuerySchema }), controller.list);
  router.get('/:id', validate({ params: idParamsSchema }), controller.get);
  router.post('/', validate({ body: createBankAccountBodySchema }), controller.create);
  router.patch('/:id', validate({ params: idParamsSchema, body: updateBankAccountBodySchema }), controller.update);
  router.delete('/:id', validate({ params: idParamsSchema }), controller.delete);
  return router;
}
