import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../../src/domain/errors';
import { errorHandler } from '../../../src/presentation/middlewares/errorHandler';
import { mockRequest, mockResponse } from '../../helpers/http';

describe('errorHandler', () => {
  it('maps NotFoundError to 404', () => {
    const res = mockResponse();

    errorHandler(new NotFoundError('Meta no encontrada'), mockRequest(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'NOT_FOUND', message: 'Meta no encontrada' } });
  });

  it('maps an unexpected error to 500 without leaking its message', () => {
    const res = mockResponse();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(new Error('connection refused at 10.0.0.1'), mockRequest(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' },
    });
  });
});
