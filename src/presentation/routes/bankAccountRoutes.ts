import { Router } from 'express';
import type { TokenService } from '../../application/services';
import type { BankAccountController } from '../controllers/BankAccountController';
import { auth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createBankAccountBodySchema, updateBankAccountBodySchema } from '../schemas/bankAccountSchemas';
import { idParamsSchema, paginationQuerySchema } from '../schemas/commonSchemas';

export function bankAccountRoutes(controller: BankAccountController, tokens: TokenService): Router {
  const router = Router();
  router.use(auth(tokens));

  router.get('/', validate({ query: paginationQuerySchema }), controller.list);
  router.get('/:id', validate({ params: idParamsSchema }), controller.get);
  router.post('/', validate({ body: createBankAccountBodySchema }), controller.create);
  router.patch('/:id', validate({ params: idParamsSchema, body: updateBankAccountBodySchema }), controller.update);
  router.delete('/:id', validate({ params: idParamsSchema }), controller.delete);
  return router;
}
