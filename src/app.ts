import express from 'express';
import cors from 'cors';
import type { Container } from './infrastructure/container';
import { AuthController } from './presentation/controllers/AuthController';
import { BankAccountController } from './presentation/controllers/BankAccountController';
import { CategoryController } from './presentation/controllers/CategoryController';
import { GoalController } from './presentation/controllers/GoalController';
import { MovementController } from './presentation/controllers/MovementController';
import { errorHandler, notFound } from './presentation/middlewares/errorHandler';
import { authRoutes } from './presentation/routes/authRoutes';
import { bankAccountRoutes } from './presentation/routes/bankAccountRoutes';
import { categoryRoutes } from './presentation/routes/categoryRoutes';
import { goalRoutes } from './presentation/routes/goalRoutes';
import { movementRoutes } from './presentation/routes/movementRoutes';

export function createApp(container: Container) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes(new AuthController(container.loginUseCase)));
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
