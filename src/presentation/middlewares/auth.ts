import type { RequestHandler } from 'express';
import type { TokenService } from '../../application/services';
import { UnauthorizedError } from '../../domain/errors';
import type { UserRepository } from '../../domain/repositories/UserRepository';

const BEARER = /^Bearer\s+(\S+)$/i;

// Same message as JwtTokenService.verify: a token of a deleted user must not say WHY it is refused.
export const INVALID_TOKEN_MESSAGE = 'Token inválido o expirado';

// Authenticates a request: the token must be valid AND its user must still be active (DEF-010: a token issued before the
// user was soft-deleted must stop working). One primary-key query per request, no cache (a 30-60 s cache was evaluated and
// left out for now, pending the performance measurements). Built once in app.ts and shared by every protected router.
export function authenticate(tokens: TokenService, users: Pick<UserRepository, 'isActive'>): RequestHandler {
  return async (req, _res, next) => {
    const match = BEARER.exec(req.headers.authorization ?? '');
    if (!match) return next(new UnauthorizedError('Falta el token de autenticación'));

    try {
      const { userId } = tokens.verify(match[1]!);
      if (!(await users.isActive(userId))) return next(new UnauthorizedError(INVALID_TOKEN_MESSAGE));
      req.user = { id: userId };
      next();
    } catch (err) {
      next(err);
    }
  };
}
