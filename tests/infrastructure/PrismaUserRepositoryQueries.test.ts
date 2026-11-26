import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaUserRepository } from '../../src/infrastructure/repositories/PrismaUserRepository';

// Doubles of the Prisma delegate: they check the query the repository builds (soft delete, selected columns), not the database.
function repositoryWith(user: Record<string, unknown>) {
  return new PrismaUserRepository({ user } as unknown as PrismaClient);
}

describe('PrismaUserRepository.findByEmailWithCredentials', () => {
  it('looks up non-deleted users only and selects the public fields plus the password hash', async () => {
    const row = { id: 'u1', email: 'camila@crezia.com', passwordHash: 'hash' };
    const findFirst = vi.fn(async () => row);

    const result = await repositoryWith({ findFirst }).findByEmailWithCredentials('camila@crezia.com');

    expect(result).toBe(row);
    expect(findFirst).toHaveBeenCalledWith({
      where: { email: 'camila@crezia.com', deletedAt: null },
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
  });

  it('returns null when there is no active user with that email', async () => {
    const findFirst = vi.fn(async () => null);

    expect(await repositoryWith({ findFirst }).findByEmailWithCredentials('nadie@crezia.com')).toBeNull();
  });
});

describe('PrismaUserRepository.existsByEmailOrDocumentId', () => {
  it('matches the email without case and the document id, ignoring deleted users', async () => {
    const findFirst = vi.fn(async () => ({ id: 'u1' }));

    await repositoryWith({ findFirst }).existsByEmailOrDocumentId('Camila@Crezia.com', '1000000009');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        OR: [{ email: { equals: 'Camila@Crezia.com', mode: 'insensitive' } }, { documentId: '1000000009' }],
      },
      select: { id: true },
    });
  });

  it('is true when a row matches and false when none does', async () => {
    expect(await repositoryWith({ findFirst: async () => ({ id: 'u1' }) }).existsByEmailOrDocumentId('a@b.co', '1')).toBe(true);
    expect(await repositoryWith({ findFirst: async () => null }).existsByEmailOrDocumentId('a@b.co', '1')).toBe(false);
  });
});

describe('PrismaUserRepository.create - success', () => {
  const NEW_USER = {
    name: 'Camila',
    documentId: '1000000009',
    email: 'camila@crezia.com',
    passwordHash: 'hash',
    birthDate: '1995-03-10',
    phone: null,
    preferredCurrencyCode: 'COP',
  };

  it('stores the birth date as UTC midnight and returns only the public fields', async () => {
    const created = { id: 'u1', name: 'Camila' };
    const create = vi.fn(async () => created);

    const result = await repositoryWith({ create }).create(NEW_USER);

    expect(result).toBe(created);
    const args = create.mock.calls[0]![0] as { data: Record<string, unknown>; select: Record<string, boolean> };
    expect(args.data.birthDate).toEqual(new Date('1995-03-10T00:00:00.000Z'));
    expect(args.data.passwordHash).toBe('hash');
    expect(args.select).not.toHaveProperty('passwordHash');
  });
});
