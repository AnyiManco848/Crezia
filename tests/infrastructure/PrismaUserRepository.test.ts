import { describe, expect, it, vi } from 'vitest';
import { UNDERAGE_MESSAGE } from '../../src/domain/entities/User';
import { UserAlreadyExistsError, ValidationError } from '../../src/domain/errors';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaUserRepository } from '../../src/infrastructure/repositories/PrismaUserRepository';

const NEW_USER = {
  name: 'Camila',
  documentId: '1000000009',
  email: 'camila@crezia.com',
  passwordHash: 'hash',
  birthDate: '2008-11-25',
  phone: null,
  preferredCurrencyCode: 'COP',
};

// Same shape Prisma 7 + the pg adapter raise for a CHECK violation (captured from the real error against the test
// database; the "detail" of the real one lists the row and is left out here).
function driverError(prismaCode: string, cause: Record<string, unknown>) {
  return Object.assign(new Error('Invalid `prisma.user.create()` invocation'), {
    code: prismaCode,
    meta: { modelName: 'User', driverAdapterError: { name: 'DriverAdapterError', cause } },
  });
}

const adultCheckViolation = () =>
  driverError('P2039', {
    originalCode: '23514',
    originalMessage: 'el nuevo registro para la relación «users» viola la restricción «check» «chk_users_adult»',
    kind: 'postgres',
    code: '23514',
    severity: 'ERROR',
  });

function repositoryFailingWith(error: unknown) {
  const prisma = { user: { create: async () => { throw error; } } } as unknown as PrismaClient;
  return new PrismaUserRepository(prisma);
}

describe('PrismaUserRepository.isActive (DEF-010)', () => {
  function repositoryFinding(row: { id: string } | null) {
    const findUnique = vi.fn(async () => row);
    const prisma = { user: { findUnique } } as unknown as PrismaClient;
    return { repository: new PrismaUserRepository(prisma), findUnique };
  }

  it('looks the user up by primary key ignoring soft-deleted rows, selecting only the id', async () => {
    const { repository, findUnique } = repositoryFinding({ id: 'u1' });

    expect(await repository.isActive('u1')).toBe(true);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u1', deletedAt: null }, select: { id: true } });
  });

  it('is false when there is no active row (unknown or deleted user)', async () => {
    expect(await repositoryFinding(null).repository.isActive('u1')).toBe(false);
  });
});

describe('PrismaUserRepository.create - database errors', () => {
  it('turns the chk_users_adult violation (23514) into the same 400 as the age validation', async () => {
    const error = await repositoryFailingWith(adultCheckViolation()).create(NEW_USER).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).details).toEqual([{ path: 'body.birthDate', message: UNDERAGE_MESSAGE }]);
    expect(UNDERAGE_MESSAGE).toBe('Debes tener 18 años o más');
  });

  it('recognises the constraint by its name, whatever language the database speaks', async () => {
    const english = driverError('P2039', {
      originalCode: '23514',
      originalMessage: 'new row for relation "users" violates check constraint "chk_users_adult"',
    });

    await expect(repositoryFailingWith(english).create(NEW_USER)).rejects.toBeInstanceOf(ValidationError);
  });

  it('does not hide another CHECK violation: it goes up unchanged', async () => {
    const other = driverError('P2039', {
      originalCode: '23514',
      originalMessage: 'new row for relation "users" violates check constraint "chk_users_email_format"',
    });

    await expect(repositoryFailingWith(other).create(NEW_USER)).rejects.toBe(other);
  });

  it('does not hide a 23514 with no readable constraint name', async () => {
    const unknown = driverError('P2039', { originalCode: '23514' });

    await expect(repositoryFailingWith(unknown).create(NEW_USER)).rejects.toBe(unknown);
  });

  it('keeps turning a unique violation (P2002) into UserAlreadyExistsError', async () => {
    const unique = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

    await expect(repositoryFailingWith(unique).create(NEW_USER)).rejects.toBeInstanceOf(UserAlreadyExistsError);
  });

  it('lets any other error go up unchanged', async () => {
    const boom = new Error('connection lost');

    await expect(repositoryFailingWith(boom).create(NEW_USER)).rejects.toBe(boom);
    await expect(repositoryFailingWith('weird').create(NEW_USER)).rejects.toBe('weird');
  });
});
