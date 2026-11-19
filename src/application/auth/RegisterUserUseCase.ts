import { isAdult, UNDERAGE_MESSAGE, type User } from '../../domain/entities/User';
import { UserAlreadyExistsError, ValidationError } from '../../domain/errors';
import type { CurrencyRepository } from '../../domain/repositories/CurrencyRepository';
import type { UserRepository } from '../../domain/repositories/UserRepository';
import type { PasswordHasher, TokenService } from '../services';

export const DEFAULT_USER_CURRENCY = 'COP';
export const INVALID_CURRENCY_MESSAGE = 'La moneda no es válida';

export interface RegisterUserInput {
  name: string;
  documentId: string;
  // "YYYY-MM-DD"
  birthDate: string;
  email: string;
  phone?: string | null;
  password: string;
  preferredCurrencyCode?: string;
}

export interface RegisterUserOutput {
  token: string;
  user: User;
}

export class RegisterUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly currencies: CurrencyRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    // The schema already checks these; they are repeated so the use case is safe on its own.
    if (!isAdult(input.birthDate, this.clock())) {
      throw new ValidationError(undefined, [{ path: 'body.birthDate', message: UNDERAGE_MESSAGE }]);
    }
    const currencyCode = input.preferredCurrencyCode ?? DEFAULT_USER_CURRENCY;
    if (!(await this.currencies.isActive(currencyCode))) {
      throw new ValidationError(undefined, [{ path: 'body.preferredCurrencyCode', message: INVALID_CURRENCY_MESSAGE }]);
    }

    const email = input.email.trim().toLowerCase();
    const documentId = input.documentId.trim();

    // The hash is computed BEFORE looking for duplicates, so "already registered" and "created" cost
    // the same time and the response time does not reveal which accounts exist.
    const passwordHash = await this.hasher.hash(input.password);

    if (await this.users.existsByEmailOrDocumentId(email, documentId)) throw new UserAlreadyExistsError();

    const user = await this.users.create({
      name: input.name.trim(),
      documentId,
      email,
      passwordHash,
      birthDate: input.birthDate,
      phone: input.phone ?? null,
      preferredCurrencyCode: currencyCode,
    });

    return { token: this.tokens.sign({ userId: user.id }), user };
  }
}
