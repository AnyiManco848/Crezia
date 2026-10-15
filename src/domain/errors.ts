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
