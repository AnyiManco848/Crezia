import { LoginUseCase } from '../application/auth/LoginUseCase';
import type { BankAccountUseCases } from '../application/bankAccounts';
import { CreateBankAccountUseCase } from '../application/bankAccounts/CreateBankAccountUseCase';
import { DeleteBankAccountUseCase } from '../application/bankAccounts/DeleteBankAccountUseCase';
import { GetBankAccountUseCase } from '../application/bankAccounts/GetBankAccountUseCase';
import { ListBankAccountsUseCase } from '../application/bankAccounts/ListBankAccountsUseCase';
import { UpdateBankAccountUseCase } from '../application/bankAccounts/UpdateBankAccountUseCase';
import type { CategoryUseCases } from '../application/categories';
import { CreateCategoryUseCase } from '../application/categories/CreateCategoryUseCase';
import { DeleteCategoryUseCase } from '../application/categories/DeleteCategoryUseCase';
import { GetCategoryUseCase } from '../application/categories/GetCategoryUseCase';
import { ListCategoriesUseCase } from '../application/categories/ListCategoriesUseCase';
import { UpdateCategoryUseCase } from '../application/categories/UpdateCategoryUseCase';
import type { TokenService } from '../application/services';
import { createPrismaClient } from './prisma/client';
import { PrismaBankAccountRepository } from './repositories/PrismaBankAccountRepository';
import { PrismaCategoryRepository } from './repositories/PrismaCategoryRepository';
import { PrismaCurrencyRepository } from './repositories/PrismaCurrencyRepository';
import { PrismaUserRepository } from './repositories/PrismaUserRepository';
import { BcryptPasswordHasher } from './security/BcryptPasswordHasher';
import { JwtTokenService } from './security/JwtTokenService';

// Composition root: wires infrastructure implementations into use cases.
export interface Container {
  tokenService: TokenService;
  loginUseCase: LoginUseCase;
  categoryUseCases: CategoryUseCases;
  bankAccountUseCases: BankAccountUseCases;
}

export function createContainer(): Container {
  const prisma = createPrismaClient();
  const tokenService = JwtTokenService.fromEnv();
  const users = new PrismaUserRepository(prisma);
  const categories = new PrismaCategoryRepository(prisma);
  const bankAccounts = new PrismaBankAccountRepository(prisma);
  const currencies = new PrismaCurrencyRepository(prisma);

  return {
    tokenService,
    loginUseCase: new LoginUseCase(users, new BcryptPasswordHasher(), tokenService),
    categoryUseCases: {
      list: new ListCategoriesUseCase(categories),
      get: new GetCategoryUseCase(categories),
      create: new CreateCategoryUseCase(categories),
      update: new UpdateCategoryUseCase(categories),
      delete: new DeleteCategoryUseCase(categories),
    },
    bankAccountUseCases: {
      list: new ListBankAccountsUseCase(bankAccounts),
      get: new GetBankAccountUseCase(bankAccounts),
      create: new CreateBankAccountUseCase(bankAccounts, currencies),
      update: new UpdateBankAccountUseCase(bankAccounts, currencies),
      delete: new DeleteBankAccountUseCase(bankAccounts),
    },
  };
}
