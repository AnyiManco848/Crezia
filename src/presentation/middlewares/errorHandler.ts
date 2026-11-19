import type { ErrorRequestHandler, RequestHandler } from 'express';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from '../../domain/errors';

function statusFor(err: DomainError): number {
  if (err instanceof ValidationError) return 400;
  if (err instanceof TooManyRequestsError) return 429;
  if (err instanceof UnauthorizedError) return 401;
  if (err instanceof ForbiddenError) return 403;
  if (err instanceof NotFoundError) return 404;
  if (err instanceof ConflictError) return 409;
  return 500;
}

// Catches unknown routes; must be registered after every router.
export const notFound: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`La ruta ${req.method} ${req.path} no existe`));
};

// Must be the last middleware. Response shape: { error: { code, message, details? } }.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof DomainError) {
    const details = err instanceof ValidationError && err.details.length > 0 ? { details: err.details } : {};
    res.status(statusFor(err)).json({ error: { code: err.code, message: err.message, ...details } });
    return;
  }

  // Malformed JSON body rejected by express.json().
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'El cuerpo de la petición no es un JSON válido' } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } });
};
