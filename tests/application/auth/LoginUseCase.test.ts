import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INVALID_CREDENTIALS_MESSAGE, LoginUseCase } from '../../../src/application/auth/LoginUseCase';
import type { PasswordHasher, TokenService } from '../../../src/application/services';
import type { UserWithCredentials } from '../../../src/domain/entities/User';
import { UnauthorizedError } from '../../../src/domain/errors';
import type { UserRepository } from '../../../src/domain/repositories/UserRepository';

const storedUser: UserWithCredentials = {
  id: 'user-1',
  documentId: '1000000001',
  name: 'Usuario de Prueba',
  email: 'test@crezia.com',
  role: 'User',
  preferredCurrencyCode: 'COP',
  passwordHash: 'hashed-Test123*',
};

describe('LoginUseCase', () => {
  let users: UserRepository;
  let hasher: PasswordHasher;
  let tokens: TokenService;
  let useCase: LoginUseCase;

  beforeEach(() => {
    users = {
      findByEmailWithCredentials: vi.fn(async (email) => (email === storedUser.email ? storedUser : null)),
      isActive: vi.fn(),
      existsByEmailOrDocumentId: vi.fn(),
      create: vi.fn(),
    };
    hasher = {
      hash: vi.fn(async (plain) => `hashed-${plain}`),
      compare: vi.fn(async (plain, hash) => hash === `hashed-${plain}`),
    };
    tokens = { sign: vi.fn(() => 'signed-token'), verify: vi.fn() };
    useCase = new LoginUseCase(users, hasher, tokens);
  });

  it('returns a token and the user without password hash for valid credentials', async () => {
    const result = await useCase.execute({ email: 'test@crezia.com', password: 'Test123*' });

    expect(result.token).toBe('signed-token');
    expect(tokens.sign).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(result.user).toEqual({
      id: 'user-1',
      documentId: '1000000001',
      name: 'Usuario de Prueba',
      email: 'test@crezia.com',
      role: 'User',
      preferredCurrencyCode: 'COP',
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('finds the user whatever the capitalization or surrounding spaces of the email (D-4)', async () => {
    const result = await useCase.execute({ email: '  TeSt@CREZIA.com  ', password: 'Test123*' });

    expect(users.findByEmailWithCredentials).toHaveBeenCalledWith('test@crezia.com');
    expect(result.user.id).toBe('user-1');
  });

  it('throws UnauthorizedError for a wrong password', async () => {
    const attempt = useCase.execute({ email: 'test@crezia.com', password: 'wrong' });

    await expect(attempt).rejects.toBeInstanceOf(UnauthorizedError);
    expect(tokens.sign).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedError with the same message for an unknown email', async () => {
    const wrongPassword = await useCase.execute({ email: 'test@crezia.com', password: 'wrong' }).catch((e) => e);
    const unknownEmail = await useCase.execute({ email: 'nobody@crezia.com', password: 'Test123*' }).catch((e) => e);

    expect(unknownEmail).toBeInstanceOf(UnauthorizedError);
    expect(unknownEmail.message).toBe(wrongPassword.message);
    // One compare for the wrong password and one (against the dummy hash) for the unknown email: same bcrypt work (DEF-007).
    expect(hasher.compare).toHaveBeenCalledTimes(2);
  });

  describe('timing of an unknown email (DEF-007)', () => {
    it('hashes a random dummy value once, at construction, with the same hasher', async () => {
      expect(hasher.hash).toHaveBeenCalledTimes(1);
      const dummyPlain = vi.mocked(hasher.hash).mock.calls[0]![0];
      expect(dummyPlain).toMatch(/^[0-9a-f]{32}$/);

      await useCase.execute({ email: 'a@crezia.com', password: 'x' }).catch(() => undefined);
      await useCase.execute({ email: 'b@crezia.com', password: 'y' }).catch(() => undefined);

      expect(hasher.hash).toHaveBeenCalledTimes(1); // not per request
    });

    it('compares the password against the dummy hash when no user is found, and never signs a token', async () => {
      const dummyHash = `hashed-${vi.mocked(hasher.hash).mock.calls[0]![0]}`;

      const error = await useCase.execute({ email: 'nobody@crezia.com', password: 'Test123*' }).catch((e) => e);

      expect(hasher.compare).toHaveBeenCalledTimes(1);
      expect(hasher.compare).toHaveBeenCalledWith('Test123*', dummyHash);
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe(INVALID_CREDENTIALS_MESSAGE);
      expect(tokens.sign).not.toHaveBeenCalled();
    });

    it('does the same for a soft-deleted account (the repository returns null for it)', async () => {
      users.findByEmailWithCredentials = vi.fn(async () => null);

      const error = await useCase.execute({ email: 'test@crezia.com', password: 'Test123*' }).catch((e) => e);

      expect(hasher.compare).toHaveBeenCalledTimes(1);
      expect(error.message).toBe(INVALID_CREDENTIALS_MESSAGE);
    });

    it('does not fall into the dummy path for an existing user (a single compare)', async () => {
      await useCase.execute({ email: 'test@crezia.com', password: 'Test123*' });

      expect(hasher.compare).toHaveBeenCalledTimes(1);
      expect(hasher.compare).toHaveBeenCalledWith('Test123*', 'hashed-Test123*');
    });

    it('does not crash at startup if the dummy hash fails; the failure surfaces on use', async () => {
      const failing: PasswordHasher = { hash: vi.fn().mockRejectedValue(new Error('boom')), compare: vi.fn() };
      const broken = new LoginUseCase(users, failing, tokens);

      await expect(broken.execute({ email: 'nobody@crezia.com', password: 'x' })).rejects.toThrow('boom');
    });
  });
});
