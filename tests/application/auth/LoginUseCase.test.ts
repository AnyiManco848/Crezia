import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginUseCase } from '../../../src/application/auth/LoginUseCase';
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
    users = { findByEmailWithCredentials: vi.fn(async (email) => (email === storedUser.email ? storedUser : null)) };
    hasher = {
      hash: vi.fn(),
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
    expect(hasher.compare).toHaveBeenCalledTimes(1);
  });
});
