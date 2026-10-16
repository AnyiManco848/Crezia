import { Prisma, type PrismaClient } from '../../generated/prisma/client';

// Tables that have the deleted_at, deleted_by and updated_by audit columns.
export type SoftDeletableTable = 'categories' | 'bank_accounts';

// deleted_at takes the database clock (now()), the same one the set_updated_at()
// trigger uses for updated_at, so both timestamps stay consistent.
// The table name comes from the closed union above, never from user input.
export async function softDeleteRow(
  prisma: PrismaClient,
  table: SoftDeletableTable,
  id: string,
  deletedBy: string,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE ${Prisma.raw(`"${table}"`)}
    SET deleted_at = now(), deleted_by = ${deletedBy}::uuid, updated_by = ${deletedBy}::uuid
    WHERE id = ${id}::uuid AND deleted_at IS NULL`;
}
