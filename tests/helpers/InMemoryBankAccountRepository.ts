import type { Page, Pagination } from '../../src/domain/pagination';
import { randomUUID } from 'node:crypto';
import type { BankAccount } from '../../src/domain/entities/BankAccount';
import type { MovementType } from '../../src/domain/entities/Movement';
import type {
  BankAccountRepository,
  CreateBankAccountData,
  MovementTotal,
  SoftDeleteData,
  UpdateBankAccountData,
} from '../../src/domain/repositories/BankAccountRepository';
import type { CurrencyRepository } from '../../src/domain/repositories/CurrencyRepository';

export interface StoredBankAccount extends BankAccount {
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
}

export interface StoredMovement {
  bankAccountId: string;
  type: MovementType;
  amount: string;
  deletedAt: Date | null;
}

// Mirrors the PrismaBankAccountRepository contract over arrays, so use cases run without a database.
export class InMemoryBankAccountRepository implements BankAccountRepository {
  readonly rows: StoredBankAccount[] = [];
  readonly movements: StoredMovement[] = [];
  sumCalls = 0;

  seed(account: Partial<StoredBankAccount> & Pick<BankAccount, 'userId'>): StoredBankAccount {
    const row: StoredBankAccount = {
      id: randomUUID(),
      bankName: 'Bancolombia',
      accountAlias: null,
      accountType: 'Savings',
      currencyCode: 'COP',
      lastSyncedAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: null,
      updatedBy: null,
      deletedAt: null,
      deletedBy: null,
      ...account,
    };
    this.rows.push(row);
    return row;
  }

  addMovement(bankAccountId: string, type: MovementType, amount: string, deletedAt: Date | null = null): void {
    this.movements.push({ bankAccountId, type, amount, deletedAt });
  }

  async listByUser(userId: string, { skip, take }: Pagination): Promise<Page<BankAccount>> {
    const all = this.rows.filter((r) => !r.deletedAt && r.userId === userId);
    return { data: all.slice(skip, skip + take).map(toPublic), total: all.length };
  }

  async findById(id: string): Promise<BankAccount | null> {
    const row = this.active(id);
    return row ? toPublic(row) : null;
  }

  async create(data: CreateBankAccountData): Promise<BankAccount> {
    return toPublic(this.seed(data));
  }

  async update(id: string, data: UpdateBankAccountData): Promise<BankAccount> {
    const row = this.active(id)!;
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) Object.assign(row, { [key]: value });
    }
    return toPublic(row);
  }

  // new Date() stands in for the database now() used by the real repository.
  async softDelete(id: string, { deletedBy }: SoftDeleteData): Promise<void> {
    Object.assign(this.active(id)!, { deletedAt: new Date(), deletedBy, updatedBy: deletedBy });
  }

  async hasMovements(id: string): Promise<boolean> {
    return this.movements.some((m) => m.bankAccountId === id && !m.deletedAt);
  }

  // Same shape as Prisma's groupBy: one row per (account, type), deleted movements excluded.
  async sumMovementsByAccount(accountIds: string[]): Promise<MovementTotal[]> {
    this.sumCalls++;
    const totals = new Map<string, MovementTotal>();
    for (const m of this.movements) {
      if (m.deletedAt || !accountIds.includes(m.bankAccountId)) continue;
      const key = `${m.bankAccountId}:${m.type}`;
      const current = totals.get(key);
      const sum = (current ? Number(current.amount) : 0) + Number(m.amount);
      totals.set(key, { bankAccountId: m.bankAccountId, type: m.type, amount: sum.toFixed(2) });
    }
    return [...totals.values()];
  }

  private active(id: string): StoredBankAccount | undefined {
    return this.rows.find((r) => r.id === id && !r.deletedAt);
  }
}

export class InMemoryCurrencyRepository implements CurrencyRepository {
  constructor(private readonly activeCodes: string[] = ['COP', 'USD']) {}

  async isActive(code: string): Promise<boolean> {
    return this.activeCodes.includes(code);
  }
}

function toPublic(row: StoredBankAccount): BankAccount {
  const { createdBy: _c, updatedBy: _u, deletedAt: _da, deletedBy: _db, ...account } = row;
  return account;
}
