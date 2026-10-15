import { Router } from 'express';
import type { AuthController } from '../controllers/AuthController';
import { validate } from '../middlewares/validate';
import { loginBodySchema } from '../schemas/authSchemas';

export function authRoutes(controller: AuthController): Router {
  const router = Router();
  router.post('/login', validate({ body: loginBodySchema }), controller.login);
  return router;
}
