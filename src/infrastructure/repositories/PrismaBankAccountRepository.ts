import type { BankAccount } from '../../domain/entities/BankAccount';
import type {
  BankAccountRepository,
  CreateBankAccountData,
  MovementTotal,
  SoftDeleteData,
  UpdateBankAccountData,
} from '../../domain/repositories/BankAccountRepository';
import type { Page, Pagination } from '../../domain/pagination';
import type { PrismaClient } from '../../generated/prisma/client';
import { softDeleteRow } from '../prisma/softDelete';

const bankAccountSelect = {
  id: true,
  userId: true,
  bankName: true,
  accountAlias: true,
  accountType: true,
  currencyCode: true,
  lastSyncedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class PrismaBankAccountRepository implements BankAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listByUser(userId: string, { skip, take }: Pagination): Promise<Page<BankAccount>> {
    const where = { userId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.bankAccount.findMany({
        where,
        // id breaks ties so pages are stable.
        orderBy: [{ bankName: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        skip,
        take,
        select: bankAccountSelect,
      }),
      this.prisma.bankAccount.count({ where }),
    ]);
    return { data, total };
  }

  findById(id: string): Promise<BankAccount | null> {
    return this.prisma.bankAccount.findFirst({
      where: { id, deletedAt: null },
      select: bankAccountSelect,
    });
  }

  create(data: CreateBankAccountData): Promise<BankAccount> {
    return this.prisma.bankAccount.create({ data, select: bankAccountSelect });
  }

  update(id: string, data: UpdateBankAccountData): Promise<BankAccount> {
    return this.prisma.bankAccount.update({
      where: { id, deletedAt: null },
      data,
      select: bankAccountSelect,
    });
  }

  softDelete(id: string, { deletedBy }: SoftDeleteData): Promise<void> {
    return softDeleteRow(this.prisma, 'bank_accounts', id, deletedBy);
  }

  async hasMovements(id: string): Promise<boolean> {
    const movement = await this.prisma.movement.findFirst({
      where: { bankAccountId: id, deletedAt: null },
      select: { id: true },
    });
    return movement !== null;
  }

  // SELECT bank_account_id, type, SUM(amount) ... GROUP BY bank_account_id, type
  async sumMovementsByAccount(accountIds: string[]): Promise<MovementTotal[]> {
    if (accountIds.length === 0) return [];
    const rows = await this.prisma.movement.groupBy({
      by: ['bankAccountId', 'type'],
      where: { bankAccountId: { in: accountIds }, deletedAt: null },
      _sum: { amount: true },
    });
    return rows.map((row) => ({
      // Never null: the where clause only matches the given account ids.
      bankAccountId: row.bankAccountId!,
      type: row.type,
      amount: row._sum.amount?.toFixed(2) ?? '0.00',
    }));
  }
}
