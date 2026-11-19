import express from 'express';
import cors from 'cors';
import { parseTrustProxy, readRegisterRateLimit, type RegisterRateLimitConfig } from './config/security';
import type { Container } from './infrastructure/container';
import { AuthController } from './presentation/controllers/AuthController';
import { BankAccountController } from './presentation/controllers/BankAccountController';
import { CategoryController } from './presentation/controllers/CategoryController';
import { GoalController } from './presentation/controllers/GoalController';
import { MovementController } from './presentation/controllers/MovementController';
import { PAGINATION_HEADERS } from './presentation/http/paginationHeaders';
import { createRegisterRateLimiter } from './presentation/middlewares/rateLimit';
import { errorHandler, notFound } from './presentation/middlewares/errorHandler';
import { authRoutes } from './presentation/routes/authRoutes';
import { bankAccountRoutes } from './presentation/routes/bankAccountRoutes';
import { categoryRoutes } from './presentation/routes/categoryRoutes';
import { goalRoutes } from './presentation/routes/goalRoutes';
import { movementRoutes } from './presentation/routes/movementRoutes';

export interface AppOptions {
  // Express "trust proxy" (see config/security.ts). Off by default.
  trustProxy?: boolean | number | string;
  registerRateLimit?: RegisterRateLimitConfig;
}

export function createApp(container: Container, options: AppOptions = {}) {
  const app = express();
  app.set('trust proxy', options.trustProxy ?? parseTrustProxy(process.env.TRUST_PROXY));
  // Hide the framework: one less hint for scanners.
  app.disable('x-powered-by');
  app.use(cors({ exposedHeaders: [...PAGINATION_HEADERS] }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes(
      new AuthController(container.loginUseCase, container.registerUserUseCase),
      createRegisterRateLimiter(options.registerRateLimit ?? readRegisterRateLimit()),
    ));
  app.use(
    '/api/categories',
    categoryRoutes(new CategoryController(container.categoryUseCases), container.tokenService),
  );
  app.use(
    '/api/bank-accounts',
    bankAccountRoutes(new BankAccountController(container.bankAccountUseCases), container.tokenService),
  );
  app.use(
    '/api/movements',
    movementRoutes(new MovementController(container.movementUseCases), container.tokenService),
  );
  app.use('/api/goals', goalRoutes(new GoalController(container.goalUseCases), container.tokenService));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
