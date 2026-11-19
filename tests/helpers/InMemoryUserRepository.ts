import { randomUUID } from 'node:crypto';
import type { NewUser, User, UserWithCredentials } from '../../src/domain/entities/User';
import { UserAlreadyExistsError } from '../../src/domain/errors';
import type { UserRepository } from '../../src/domain/repositories/UserRepository';

export interface StoredUser extends UserWithCredentials {
  birthDate: string;
  phone: string | null;
  deletedAt: Date | null;
}

// Mirrors the PrismaUserRepository contract over an array, so use cases run without a database.
// Like the real partial unique indexes, soft-deleted users do not block a new registration.
export class InMemoryUserRepository implements UserRepository {
  readonly rows: StoredUser[] = [];
  // Test hook: simulates the database rejecting a duplicate that slipped past the check (a race).
  failNextCreateWithDuplicate = false;

  async findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    return this.rows.find((row) => row.email === email && !row.deletedAt) ?? null;
  }

  async existsByEmailOrDocumentId(email: string, documentId: string): Promise<boolean> {
    return this.rows.some(
      (row) => !row.deletedAt && (row.email.toLowerCase() === email.toLowerCase() || row.documentId === documentId),
    );
  }

  async create(data: NewUser): Promise<User> {
    if (this.failNextCreateWithDuplicate) {
      this.failNextCreateWithDuplicate = false;
      throw new UserAlreadyExistsError();
    }
    if (await this.existsByEmailOrDocumentId(data.email, data.documentId)) throw new UserAlreadyExistsError();
    const row: StoredUser = {
      id: randomUUID(),
      documentId: data.documentId,
      name: data.name,
      email: data.email,
      role: 'User',
      preferredCurrencyCode: data.preferredCurrencyCode,
      passwordHash: data.passwordHash,
      birthDate: data.birthDate,
      phone: data.phone,
      deletedAt: null,
    };
    this.rows.push(row);
    return {
      id: row.id,
      documentId: row.documentId,
      name: row.name,
      email: row.email,
      role: row.role,
      preferredCurrencyCode: row.preferredCurrencyCode,
    };
  }
}
