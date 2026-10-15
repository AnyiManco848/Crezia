import type { UserWithCredentials } from '../../domain/entities/User';
import type { UserRepository } from '../../domain/repositories/UserRepository';
import type { PrismaClient } from '../../generated/prisma/client';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        documentId: true,
        name: true,
        email: true,
        role: true,
        preferredCurrencyCode: true,
        passwordHash: true,
      },
    });
  }
}
