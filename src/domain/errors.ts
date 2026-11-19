export interface ErrorDetail {
  path: string;
  message: string;
}

export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';

  constructor(
    message = 'Los datos enviados no son válidos',
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'No autorizado') {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';

  constructor(message = 'No tienes permiso para realizar esta acción') {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';

  constructor(message = 'Recurso no encontrado') {
    super(message);
  }
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';

  constructor(message = 'El recurso ya existe') {
    super(message);
  }
}

// One message for a repeated email, a repeated document id or both, so the answer does not say which
// of them exists (see docs/generated/specs/registro/registro-usuario.md, D-1).
export const REGISTRATION_CONFLICT_MESSAGE =
  'No pudimos crear la cuenta con esos datos. Revisa la información o inicia sesión si ya tienes una cuenta.';

export class UserAlreadyExistsError extends ConflictError {
  constructor() {
    super(REGISTRATION_CONFLICT_MESSAGE);
  }
}

export class TooManyRequestsError extends DomainError {
  readonly code = 'TOO_MANY_REQUESTS';

  constructor(message = 'Demasiados intentos. Inténtalo de nuevo en unos minutos.') {
    super(message);
  }
}
