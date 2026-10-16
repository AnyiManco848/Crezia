import type { CreateBankAccountUseCase } from './CreateBankAccountUseCase';
import type { DeleteBankAccountUseCase } from './DeleteBankAccountUseCase';
import type { GetBankAccountUseCase } from './GetBankAccountUseCase';
import type { ListBankAccountsUseCase } from './ListBankAccountsUseCase';
import type { UpdateBankAccountUseCase } from './UpdateBankAccountUseCase';

// Built by the container and consumed by the bank account controller.
export interface BankAccountUseCases {
  list: ListBankAccountsUseCase;
  get: GetBankAccountUseCase;
  create: CreateBankAccountUseCase;
  update: UpdateBankAccountUseCase;
  delete: DeleteBankAccountUseCase;
}
