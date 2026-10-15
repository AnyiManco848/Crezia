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
// does not reveal which accounts exist.
export const INVALID_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos';

export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute({ email, password }: LoginInput): Promise<LoginOutput> {
    const found = await this.users.findByEmailWithCredentials(email);
    if (!found) throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);

    const matches = await this.hasher.compare(password, found.passwordHash);
    if (!matches) throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);

    const { passwordHash: _omit, ...user } = found;
    return { token: this.tokens.sign({ userId: user.id }), user };
  }
}
