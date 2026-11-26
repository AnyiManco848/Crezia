import { describe, expect, it, vi } from 'vitest';
import {
  ConflictError,
  ForbiddenError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from '../../../src/domain/errors';
import { errorHandler, notFound } from '../../../src/presentation/middlewares/errorHandler';
import { mockRequest, mockResponse } from '../../helpers/http';

describe('errorHandler - status of each domain error', () => {
  it.each([
    [new UnauthorizedError('Falta el token'), 401, 'UNAUTHORIZED'],
    [new ForbiddenError(), 403, 'FORBIDDEN'],
    [new ConflictError('Ya existe'), 409, 'CONFLICT'],
    [new TooManyRequestsError(), 429, 'TOO_MANY_REQUESTS'],
    [new ValidationError('Datos inválidos'), 400, 'VALIDATION_ERROR'],
  ])('maps %o to %i %s', (error, status, code) => {
    const res = mockResponse();

    errorHandler(error, mockRequest(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ error: { code, message: error.message } });
  });

  it('adds the field details of a ValidationError when there are any', () => {
    const res = mockResponse();
    const details = [{ path: 'body.name', message: 'El nombre es obligatorio' }];

    errorHandler(new ValidationError(undefined, details), mockRequest(), res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'Los datos enviados no son válidos', details },
    });
  });

  it('answers 400 INVALID_JSON when express.json() rejects the body', () => {
    const res = mockResponse();

    errorHandler(Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed' }), mockRequest(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INVALID_JSON', message: 'El cuerpo de la petición no es un JSON válido' },
    });
  });

  it('answers 500 also when what was thrown is not an Error at all', () => {
    const res = mockResponse();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(undefined, mockRequest(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } });
  });
});

describe('notFound', () => {
  it('forwards a NotFoundError that names the method and path', () => {
    const next = vi.fn();

    notFound(mockRequest({ method: 'GET', path: '/api/nada' }), mockResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]![0]).toMatchObject({ code: 'NOT_FOUND', message: 'La ruta GET /api/nada no existe' });
  });
});
