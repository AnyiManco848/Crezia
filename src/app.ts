import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { parseCorsOrigins } from './config/cors';
import { parseTrustProxy, readLoginRateLimit, readRegisterRateLimit, type RateLimitConfig, type RegisterRateLimitConfig } from './config/security';
import type { Container } from './infrastructure/container';
import { AuthController } from './presentation/controllers/AuthController';
import { BankAccountController } from './presentation/controllers/BankAccountController';
import { CategoryController } from './presentation/controllers/CategoryController';
import { GoalController } from './presentation/controllers/GoalController';
import { MovementController } from './presentation/controllers/MovementController';
import { PAGINATION_HEADERS } from './presentation/http/paginationHeaders';
import { authenticate } from './presentation/middlewares/auth';
import { createLoginRateLimiter, createRegisterRateLimiter } from './presentation/middlewares/rateLimit';
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
  loginRateLimit?: RateLimitConfig;
  // Origins (scheme + host + port) allowed to call the API from a browser. Read from CORS_ORIGINS by default.
  corsOrigins?: string[];
}

export function createApp(container: Container, options: AppOptions = {}) {
  const app = express();
  app.set('trust proxy', options.trustProxy ?? parseTrustProxy(process.env.TRUST_PROXY));
  // Security headers (helmet). The API only returns JSON, so the policy is the strictest one: nothing may be loaded
  // from a response and it cannot be framed. Everything else keeps helmet's defaults (HSTS, nosniff, no-referrer,
  // frame and cross-origin protections). helmet also removes X-Powered-By (one less hint for scanners).
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] },
      },
    }),
  );
  // Only the listed front-end origins may read the responses from a browser (never "*": requests carry a bearer
  // token). Retry-After comes with the 429 of the registration and login limiters; without exposing it a browser client on
  // another origin cannot read how long to wait.
  app.use(
    cors({
      origin: options.corsOrigins ?? parseCorsOrigins(process.env.CORS_ORIGINS),
      exposedHeaders: [...PAGINATION_HEADERS, 'Retry-After'],
      maxAge: 600,
    }),
  );
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Built once: valid token AND active user, for every protected router (DEF-010).
  const authenticateRequest = authenticate(container.tokenService, container.userRepository);
  app.use('/api/auth', authRoutes(
      new AuthController(container.loginUseCase, container.registerUserUseCase),
      createRegisterRateLimiter(options.registerRateLimit ?? readRegisterRateLimit()),
      createLoginRateLimiter(options.loginRateLimit ?? readLoginRateLimit()),
    ));
  app.use(
    '/api/categories',
    categoryRoutes(new CategoryController(container.categoryUseCases), authenticateRequest),
  );
  app.use(
    '/api/bank-accounts',
    bankAccountRoutes(new BankAccountController(container.bankAccountUseCases), authenticateRequest),
  );
  app.use(
    '/api/movements',
    movementRoutes(new MovementController(container.movementUseCases), authenticateRequest),
  );
  app.use('/api/goals', goalRoutes(new GoalController(container.goalUseCases), authenticateRequest));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
