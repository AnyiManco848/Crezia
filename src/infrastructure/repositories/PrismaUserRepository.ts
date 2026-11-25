import { UNDERAGE_MESSAGE, type NewUser, type User, type UserWithCredentials } from '../../domain/entities/User';
import { UserAlreadyExistsError, ValidationError } from '../../domain/errors';
import type { UserRepository } from '../../domain/repositories/UserRepository';
import type { PrismaClient } from '../../generated/prisma/client';

const PUBLIC_FIELDS = {
  id: true,
  documentId: true,
  name: true,
  email: true,
  role: true,
  preferredCurrencyCode: true,
} as const;

// Prisma's "unique constraint failed" code. The indexes uq_users_email and uq_users_document_id are partial
// (only non-deleted users), so a deleted user never blocks a new registration.
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}

// The database repeats the age rule as the CHECK constraint chk_users_adult (birth_date <= CURRENT_DATE - 18 years).
// The use case already refuses minors using the UTC date, but CURRENT_DATE follows the time zone of the database
// session: when that zone is behind UTC, for a few hours a day the two disagree by one day and the insert fails
// with PostgreSQL error 23514 (DEF-002, docs/testing/defectos.md). Prisma reports it as a known request error whose
// driver cause carries the code and the constraint name (matched by name: the message text depends on the
// database language). Any other CHECK violation is NOT hidden.
function isAdultCheckViolation(error: unknown): boolean {
  const cause = (error as { meta?: { driverAdapterError?: { cause?: Record<string, unknown> } } } | null)?.meta
    ?.driverAdapterError?.cause;
  if (!cause) return false;
  const code = cause.originalCode ?? cause.code;
  const text = String(cause.originalMessage ?? cause.message ?? '');
  return code === '23514' && text.includes('chk_users_adult');
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { ...PUBLIC_FIELDS, passwordHash: true },
    });
  }

  async isActive(userId: string): Promise<boolean> {
    const found = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null }, select: { id: true } });
    return found !== null;
  }

  async existsByEmailOrDocumentId(email: string, documentId: string): Promise<boolean> {
    const found = await this.prisma.user.findFirst({
      where: { deletedAt: null, OR: [{ email: { equals: email, mode: 'insensitive' } }, { documentId }] },
      select: { id: true },
    });
    return found !== null;
  }

  async create(data: NewUser): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          documentId: data.documentId,
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
          birthDate: new Date(`${data.birthDate}T00:00:00.000Z`),
          phone: data.phone,
          preferredCurrencyCode: data.preferredCurrencyCode,
        },
        select: PUBLIC_FIELDS,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new UserAlreadyExistsError();
      // Same answer as the age validation: a 400 under the birth date, not a 500.
      if (isAdultCheckViolation(error)) {
        throw new ValidationError(undefined, [{ path: 'body.birthDate', message: UNDERAGE_MESSAGE }]);
      }
      throw error;
    }
  }
}
