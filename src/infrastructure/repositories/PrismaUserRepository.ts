import type { NewUser, User, UserWithCredentials } from '../../domain/entities/User';
import { UserAlreadyExistsError } from '../../domain/errors';
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

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { ...PUBLIC_FIELDS, passwordHash: true },
    });
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
      throw error;
    }
  }
}
