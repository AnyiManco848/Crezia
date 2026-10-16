import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../../src/domain/errors';
import { errorHandler } from '../../../src/presentation/middlewares/errorHandler';
import { validate } from '../../../src/presentation/middlewares/validate';
import { loginBodySchema } from '../../../src/presentation/schemas/authSchemas';
import { mockRequest, mockResponse } from '../../helpers/http';

describe('validate middleware', () => {
  it('responds 400 with details when the body is invalid', () => {
    const req = mockRequest({ body: { email: 'not-an-email' } });
    const next = vi.fn();

    validate({ body: loginBodySchema })(req, mockResponse(), next);

    const err = next.mock.calls[0]![0];
    expect(err).toBeInstanceOf(ValidationError);

    const res = mockResponse();
    errorHandler(err, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0]![0];
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.map((d: { path: string }) => d.path)).toEqual(['body.email', 'body.password']);
  });

  it('replaces the body with the parsed value and calls next without error', () => {
    const req = mockRequest({ body: { email: '  test@crezia.com ', password: 'Test123*', extra: true } });
    const next = vi.fn();

    validate({ body: loginBodySchema })(req, mockResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ email: 'test@crezia.com', password: 'Test123*' });
  });
});
