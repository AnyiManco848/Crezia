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

// Read-only: CURRENT_DATE as the database sees it ("YYYY-MM-DD", in the time zone of the database session).
// Only for the TEST database (guard). DEF-002 (docs/testing/defectos.md): the age check chk_users_adult uses this date,
// while the API uses the UTC date, so a test can tell when the two differ.
export async function getDatabaseCurrentDate(): Promise<string> {
  assertApiTestRun();
  const prisma = createPrismaClient();
  try {
    const rows = await prisma.$queryRaw<{ today: string }[]>`SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS today`;
    return rows[0].today;
  } finally {
    await prisma.$disconnect();
  }
}

// Users created by the login API tests (login-security.spec.ts) use their own document prefix, so the registration
// tests' cleanup (E2E prefix) never deletes them while both files run in parallel.
export const E2E_LOGIN_DOCUMENT_PREFIX = 'E2L';

// Hard-deletes the users of the login tests. Same guard and same double marker (e2e email domain + login prefix).
export async function deleteE2eLoginUsers(): Promise<number> {
  assertApiTestRun();
  const prisma = createPrismaClient();
  try {
    const { count } = await prisma.user.deleteMany({
      where: { email: { endsWith: E2E_EMAIL_DOMAIN }, documentId: { startsWith: E2E_LOGIN_DOCUMENT_PREFIX } },
    });
    return count;
  } finally {
    await prisma.$disconnect();
  }
}

// Soft-deletes (deleted_at = now) ONE login-test user, the way the application marks a deleted account.
// Only rows with the e2e email domain AND the login prefix can be touched.
export async function softDeleteE2eLoginUser(email: string): Promise<number> {
  assertApiTestRun();
  const prisma = createPrismaClient();
  try {
    const { count } = await prisma.user.updateMany({
      where: { email, deletedAt: null, documentId: { startsWith: E2E_LOGIN_DOCUMENT_PREFIX } },
      data: { deletedAt: new Date() },
    });
    return count;
  } finally {
    await prisma.$disconnect();
  }
}
