import jwt, { type SignOptions } from 'jsonwebtoken';
import type { TokenPayload, TokenService } from '../../application/services';
import { UnauthorizedError } from '../../domain/errors';

const ALGORITHM = 'HS256';

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: SignOptions['expiresIn'],
  ) {
    if (!secret) throw new Error('JWT_SECRET is not set');
  }

  static fromEnv(): JwtTokenService {
    return new JwtTokenService(
      process.env.JWT_SECRET ?? '',
      (process.env.JWT_EXPIRES_IN ?? '1d') as SignOptions['expiresIn'],
    );
  }

  sign({ userId }: TokenPayload): string {
    return jwt.sign({}, this.secret, {
      subject: userId,
      expiresIn: this.expiresIn,
      algorithm: ALGORITHM,
    });
  }

  verify(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret, { algorithms: [ALGORITHM] });
      if (typeof decoded === 'string' || !decoded.sub) throw new Error('Missing subject');
      return { userId: decoded.sub };
    } catch {
      throw new UnauthorizedError('Token inválido o expirado');
    }
  }
}
