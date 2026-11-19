import { createPrismaClient } from '../src/infrastructure/prisma/client';
import { assertApiTestRun } from '../src/config/testDbGuard';

// Users created by the registration API tests are recognizable: this email domain AND this document prefix.
export const E2E_EMAIL_DOMAIN = '@e2e.crezia.test';
export const E2E_DOCUMENT_PREFIX = 'E2E';

// Hard-deletes the users the registration tests created. The API has no endpoint to delete users and soft
// delete would leave their unique email/document id blocking the next run. It only runs against the TEST
// database (guard) and only touches rows that match BOTH the e2e email domain and the e2e document prefix.
export async function deleteE2eUsers(): Promise<number> {
  assertApiTestRun();
  const prisma = createPrismaClient();
  try {
    const { count } = await prisma.user.deleteMany({
      where: { email: { endsWith: E2E_EMAIL_DOMAIN }, documentId: { startsWith: E2E_DOCUMENT_PREFIX } },
    });
    return count;
  } finally {
    await prisma.$disconnect();
  }
}

// Reads a user straight from the database to check what the API stored (hash, role, dates).
export async function findUserByEmail(email: string) {
  assertApiTestRun();
  const prisma = createPrismaClient();
  try {
    return await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        role: true,
        passwordHash: true,
        preferredCurrencyCode: true,
        deletedAt: true,
        financialProfile: { select: { id: true } },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
