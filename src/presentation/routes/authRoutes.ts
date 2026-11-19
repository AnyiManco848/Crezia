import { Router, type RequestHandler } from 'express';
import type { AuthController } from '../controllers/AuthController';
import { validate } from '../middlewares/validate';
import { loginBodySchema, registerBodySchema } from '../schemas/authSchemas';

// The limiter goes BEFORE validation: invalid attempts count too.
export function authRoutes(controller: AuthController, registerLimiter: RequestHandler): Router {
  const router = Router();
  router.post('/login', validate({ body: loginBodySchema }), controller.login);
  router.post('/register', registerLimiter, validate({ body: registerBodySchema }), controller.register);
  return router;
}
