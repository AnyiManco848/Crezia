import express from 'express';
import cors from 'cors';
import type { Container } from './infrastructure/container';
import { AuthController } from './presentation/controllers/AuthController';
import { errorHandler, notFound } from './presentation/middlewares/errorHandler';
import { authRoutes } from './presentation/routes/authRoutes';

export function createApp(container: Container) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes(new AuthController(container.loginUseCase)));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
