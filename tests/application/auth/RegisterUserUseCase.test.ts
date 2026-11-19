import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterUserUseCase, type RegisterUserInput } from '../../../src/application/auth/RegisterUserUseCase';
import type { PasswordHasher, TokenService } from '../../../src/application/services';
import { REGISTRATION_CONFLICT_MESSAGE, UserAlreadyExistsError, ValidationError } from '../../../src/domain/errors';
import type { CurrencyRepository } from '../../../src/domain/repositories/CurrencyRepository';
import { InMemoryUserRepository } from '../../helpers/InMemoryUserRepository';

const TODAY = new Date('2026-11-18T12:00:00Z');
const VALID: RegisterUserInput = {
  name: '  Camila Rodríguez  ',
  documentId: ' 1000000002 ',
  birthDate: '1995-03-10',
  email: 'Camila@Crezia.com ',
  password: 'Clave1234',
};

describe('RegisterUserUseCase', () => {
  let users: InMemoryUserRepository;
  let currencies: CurrencyRepository;
  let hasher: PasswordHasher;
  let tokens: TokenService;
  let useCase: RegisterUserUseCase;
  let order: string[];

  beforeEach(() => {
    order = [];
    users = new InMemoryUserRepository();
    const exists = users.existsByEmailOrDocumentId.bind(users);
    users.existsByEmailOrDocumentId = async (email, doc) => {
      order.push('exists');
      return exists(email, doc);
    };
    currencies = { isActive: vi.fn(async (code: string) => ['COP', 'USD'].includes(code)) };
    hasher = {
      hash: vi.fn(async (plain: string) => {
        order.push('hash');
        return `hashed-${plain}`;
      }),
      compare: vi.fn(),
    };
    tokens = { sign: vi.fn(() => 'signed-token'), verify: vi.fn() };
    useCase = new RegisterUserUseCase(users, currencies, hasher, tokens, () => TODAY);
  });

  it('creates the user with role User, COP by default, trimmed data and lowercase email', async () => {
    const result = await useCase.execute(VALID);

    expect(result.token).toBe('signed-token');
    expect(result.user).toEqual({
      id: expect.any(String),
      documentId: '1000000002',
      name: 'Camila Rodríguez',
      email: 'camila@crezia.com',
      role: 'User',
      preferredCurrencyCode: 'COP',
    });
    expect(tokens.sign).toHaveBeenCalledWith({ userId: result.user.id });
  });

  it('never returns the password hash and stores the hash, not the password', async () => {
    const result = await useCase.execute(VALID);

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(users.rows[0]?.passwordHash).toBe('hashed-Clave1234');
    expect(JSON.stringify(users.rows[0])).not.toContain('"Clave1234"');
  });

  it('keeps the chosen currency when it is active', async () => {
    const result = await useCase.execute({ ...VALID, preferredCurrencyCode: 'USD' });

    expect(result.user.preferredCurrencyCode).toBe('USD');
  });

  it('rejects an inactive or unknown currency without creating the user', async () => {
    const attempt = useCase.execute({ ...VALID, preferredCurrencyCode: 'XXX' });

    await expect(attempt).rejects.toBeInstanceOf(ValidationError);
    expect(users.rows).toHaveLength(0);
  });

  it('rejects a person under 18 and accepts one who turns 18 today', async () => {
    await expect(useCase.execute({ ...VALID, birthDate: '2008-11-19' })).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute({ ...VALID, birthDate: '2008-11-18' })).resolves.toBeDefined();
  });

  it('throws the generic conflict for a repeated email, ignoring case', async () => {
    await useCase.execute(VALID);

    const attempt = useCase.execute({ ...VALID, documentId: '2000000000', email: 'CAMILA@crezia.com' });

    await expect(attempt).rejects.toBeInstanceOf(UserAlreadyExistsError);
    expect(users.rows).toHaveLength(1);
  });

  it('gives the same message for a repeated email, a repeated document id and both', async () => {
    await useCase.execute(VALID);
    const messages = await Promise.all([
      useCase.execute({ ...VALID, documentId: '2000000000' }).catch((e: Error) => e.message),
      useCase.execute({ ...VALID, email: 'otra@crezia.com' }).catch((e: Error) => e.message),
      useCase.execute(VALID).catch((e: Error) => e.message),
    ]);

    expect(new Set(messages)).toEqual(new Set([REGISTRATION_CONFLICT_MESSAGE]));
  });

  it('hashes the password BEFORE looking for duplicates (same cost for new and existing accounts)', async () => {
    await useCase.execute(VALID);
    order.length = 0;

    await useCase.execute(VALID).catch(() => undefined);

    expect(order).toEqual(['hash', 'exists']);
  });

  it('answers with the generic conflict when the database rejects a race duplicate', async () => {
    users.failNextCreateWithDuplicate = true;

    await expect(useCase.execute(VALID)).rejects.toBeInstanceOf(UserAlreadyExistsError);
  });

  it('allows registering again with the email of a soft-deleted user', async () => {
    const first = await useCase.execute(VALID);
    users.rows.find((row) => row.id === first.user.id)!.deletedAt = new Date();

    const second = await useCase.execute(VALID);

    expect(second.user.id).not.toBe(first.user.id);
  });

  it('does not hash when the input is invalid', async () => {
    await useCase.execute({ ...VALID, birthDate: '2020-01-01' }).catch(() => undefined);

    expect(hasher.hash).not.toHaveBeenCalled();
  });
});
