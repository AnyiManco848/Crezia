import { LoginUseCase } from '../application/auth/LoginUseCase';
import { RegisterUserUseCase } from '../application/auth/RegisterUserUseCase';
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
import type { GoalUseCases } from '../application/goals';
import { CreateGoalUseCase } from '../application/goals/CreateGoalUseCase';
import { DeleteGoalUseCase } from '../application/goals/DeleteGoalUseCase';
import { GetGoalUseCase } from '../application/goals/GetGoalUseCase';
import { ListGoalsUseCase } from '../application/goals/ListGoalsUseCase';
import { UpdateGoalUseCase } from '../application/goals/UpdateGoalUseCase';
import type { MovementUseCases } from '../application/movements';
import { CreateMovementUseCase } from '../application/movements/CreateMovementUseCase';
import { DeleteMovementUseCase } from '../application/movements/DeleteMovementUseCase';
import { GetMovementSummaryUseCase } from '../application/movements/GetMovementSummaryUseCase';
import { GetMovementUseCase } from '../application/movements/GetMovementUseCase';
import { ListMovementsUseCase } from '../application/movements/ListMovementsUseCase';
import { UpdateMovementUseCase } from '../application/movements/UpdateMovementUseCase';
import type { TokenService } from '../application/services';
import { createPrismaClient } from './prisma/client';
import { PrismaBankAccountRepository } from './repositories/PrismaBankAccountRepository';
import { PrismaCategoryRepository } from './repositories/PrismaCategoryRepository';
import { PrismaCurrencyRepository } from './repositories/PrismaCurrencyRepository';
import { PrismaGoalRepository } from './repositories/PrismaGoalRepository';
import { PrismaMovementRepository } from './repositories/PrismaMovementRepository';
import type { UserRepository } from '../domain/repositories/UserRepository';
import { PrismaUserRepository } from './repositories/PrismaUserRepository';
import { BcryptPasswordHasher } from './security/BcryptPasswordHasher';
import { JwtTokenService } from './security/JwtTokenService';

// Composition root: wires infrastructure implementations into use cases.
export interface Container {
  tokenService: TokenService;
  // Read-only port the authentication middleware uses to check the user is still active.
  userRepository: Pick<UserRepository, 'isActive'>;
  loginUseCase: LoginUseCase;
  registerUserUseCase: RegisterUserUseCase;
  categoryUseCases: CategoryUseCases;
  bankAccountUseCases: BankAccountUseCases;
  movementUseCases: MovementUseCases;
  goalUseCases: GoalUseCases;
}

export function createContainer(): Container {
  const prisma = createPrismaClient();
  const tokenService = JwtTokenService.fromEnv();
  const users = new PrismaUserRepository(prisma);
  const categories = new PrismaCategoryRepository(prisma);
  const bankAccounts = new PrismaBankAccountRepository(prisma);
  const currencies = new PrismaCurrencyRepository(prisma);
  const movements = new PrismaMovementRepository(prisma);
  const goals = new PrismaGoalRepository(prisma);
  // One hasher (one bcrypt cost) for login and registration: the login's dummy hash must cost the same as the real ones.
  const passwordHasher = new BcryptPasswordHasher();

  return {
    tokenService,
    userRepository: users,
    loginUseCase: new LoginUseCase(users, passwordHasher, tokenService),
    registerUserUseCase: new RegisterUserUseCase(users, currencies, passwordHasher, tokenService),
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
    movementUseCases: {
      list: new ListMovementsUseCase(movements),
      summary: new GetMovementSummaryUseCase(movements),
      get: new GetMovementUseCase(movements),
      create: new CreateMovementUseCase(movements, categories, bankAccounts, currencies),
      update: new UpdateMovementUseCase(movements, categories, bankAccounts, currencies),
      delete: new DeleteMovementUseCase(movements),
    },
    goalUseCases: {
      list: new ListGoalsUseCase(goals),
      get: new GetGoalUseCase(goals),
      create: new CreateGoalUseCase(goals, categories, currencies),
      update: new UpdateGoalUseCase(goals, categories, currencies),
      delete: new DeleteGoalUseCase(goals),
    },
  };
}
