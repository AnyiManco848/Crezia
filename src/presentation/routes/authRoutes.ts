import { Router, type RequestHandler } from 'express';
import type { AuthController } from '../controllers/AuthController';
import { validate } from '../middlewares/validate';
import { loginBodySchema, registerBodySchema } from '../schemas/authSchemas';

// The limiters go BEFORE validation: invalid attempts count too. loginLimiter is optional only so older callers/tests compile;
// app.ts always passes it.
export function authRoutes(controller: AuthController, registerLimiter: RequestHandler, loginLimiter?: RequestHandler): Router {
  const router = Router();
  router.post('/login', ...(loginLimiter ? [loginLimiter] : []), validate({ body: loginBodySchema }), controller.login);
  router.post('/register', registerLimiter, validate({ body: registerBodySchema }), controller.register);
  return router;
}
