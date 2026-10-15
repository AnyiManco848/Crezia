import { LoginUseCase } from '../application/auth/LoginUseCase';
import type { TokenService } from '../application/services';
import { createPrismaClient } from './prisma/client';
import { PrismaUserRepository } from './repositories/PrismaUserRepository';
import { BcryptPasswordHasher } from './security/BcryptPasswordHasher';
import { JwtTokenService } from './security/JwtTokenService';

// Composition root: wires infrastructure implementations into use cases.
export interface Container {
  tokenService: TokenService;
  loginUseCase: LoginUseCase;
}

export function createContainer(): Container {
  const prisma = createPrismaClient();
  const tokenService = JwtTokenService.fromEnv();
  const users = new PrismaUserRepository(prisma);

  return {
    tokenService,
    loginUseCase: new LoginUseCase(users, new BcryptPasswordHasher(), tokenService),
  };
}
