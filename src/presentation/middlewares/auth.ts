import type { RequestHandler } from 'express';
import type { TokenService } from '../../application/services';
import { UnauthorizedError } from '../../domain/errors';

const BEARER = /^Bearer\s+(\S+)$/i;

export function auth(tokens: TokenService): RequestHandler {
  return (req, _res, next) => {
    const match = BEARER.exec(req.headers.authorization ?? '');
    if (!match) return next(new UnauthorizedError('Falta el token de autenticación'));

    try {
      const { userId } = tokens.verify(match[1]!);
      req.user = { id: userId };
      next();
    } catch (err) {
      next(err);
    }
  };
}
