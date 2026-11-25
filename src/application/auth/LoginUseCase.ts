import { randomBytes } from 'node:crypto';
import type { User } from '../../domain/entities/User';
import { UnauthorizedError } from '../../domain/errors';
import type { UserRepository } from '../../domain/repositories/UserRepository';
import type { PasswordHasher, TokenService } from '../services';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  token: string;
  user: User;
}

// Same message for unknown email and wrong password, so the response
// does not reveal which accounts exist. The response TIME must not reveal it either (DEF-007): see dummyHash below.
export const INVALID_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos';

export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {
    // Valid hash of a random value, made ONCE at startup by the same hasher that hashes the real passwords, so it always has the
    // configured cost. When no user matches, the password is compared against it so the request spends the same bcrypt time as a
    // wrong password for an existing account. The promise is started here and awaited on use; the catch only avoids an unhandled
    // rejection at startup (the failure still surfaces when the hash is awaited).
    this.dummyHash = Promise.resolve(this.hasher.hash(randomBytes(16).toString('hex')));
    this.dummyHash.catch(() => undefined);
  }

  private readonly dummyHash: Promise<string>;

  async execute({ email, password }: LoginInput): Promise<LoginOutput> {
    // Defence in depth: the schema already normalizes, but the use case must not depend on the caller (same as registration).
    const found = await this.users.findByEmailWithCredentials(email.trim().toLowerCase());
    if (!found) {
      // Unknown or soft-deleted account: burn the same bcrypt time, ignore the result and fail with the same error.
      await this.hasher.compare(password, await this.dummyHash);
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const matches = await this.hasher.compare(password, found.passwordHash);
    if (!matches) throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);

    const { passwordHash: _omit, ...user } = found;
    return { token: this.tokens.sign({ userId: user.id }), user };
  }
}
