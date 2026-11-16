import type { AccountType, BankAccount } from '../entities/BankAccount';
import type { MovementType } from '../entities/Movement';
import type { Page, Pagination } from '../pagination';
import type { SoftDeleteData } from './CategoryRepository';

export type { SoftDeleteData };

export interface CreateBankAccountData {
  userId: string;
  bankName: string;
  accountAlias: string | null;
  accountType: AccountType;
  currencyCode: string;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateBankAccountData {
  bankName?: string;
  accountAlias?: string | null;
  accountType?: AccountType;
  currencyCode?: string;
  updatedBy: string;
}

// Sum of the non-deleted movements of one account for one type.
// amount is a decimal string (e.g. "3500000.00").
export interface MovementTotal {
  bankAccountId: string;
  type: MovementType;
  amount: string;
}

// Every read ignores soft-deleted accounts.
export interface BankAccountRepository {
  // Ordered by bank name, creation date and id, so pages are stable.
  listByUser(userId: string, pagination: Pagination): Promise<Page<BankAccount>>;
  // Any owner; access rules are applied by the use cases.
  findById(id: string): Promise<BankAccount | null>;
  create(data: CreateBankAccountData): Promise<BankAccount>;
  update(id: string, data: UpdateBankAccountData): Promise<BankAccount>;
  softDelete(id: string, data: SoftDeleteData): Promise<void>;
  // One grouped query for all the given accounts, ignoring soft-deleted movements.
  // Accounts without movements of a type have no row for it.
  sumMovementsByAccount(accountIds: string[]): Promise<MovementTotal[]>;
  // True when the account has at least one non-deleted movement.
  hasMovements(id: string): Promise<boolean>;
}
