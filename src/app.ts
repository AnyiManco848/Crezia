import express from 'express';
import cors from 'cors';
import type { Container } from './infrastructure/container';
import { AuthController } from './presentation/controllers/AuthController';
import { BankAccountController } from './presentation/controllers/BankAccountController';
import { CategoryController } from './presentation/controllers/CategoryController';
import { errorHandler, notFound } from './presentation/middlewares/errorHandler';
import { authRoutes } from './presentation/routes/authRoutes';
import { bankAccountRoutes } from './presentation/routes/bankAccountRoutes';
import { categoryRoutes } from './presentation/routes/categoryRoutes';

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

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
