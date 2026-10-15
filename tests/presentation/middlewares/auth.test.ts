import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '../../../src/domain/errors';
import { JwtTokenService } from '../../../src/infrastructure/security/JwtTokenService';
import { auth } from '../../../src/presentation/middlewares/auth';
import { errorHandler } from '../../../src/presentation/middlewares/errorHandler';
import { mockRequest, mockResponse } from '../../helpers/http';

const tokens = new JwtTokenService('test-secret', '1h');

function run(authorization?: string) {
  const req = mockRequest({ headers: authorization ? { authorization } : {} });
  const res = mockResponse();
  const next = vi.fn();
  auth(tokens)(req, res, next);
  return { req, res, next };
}

// Passes whatever auth forwarded through the real error handler to get the HTTP status.
function statusOf(err: unknown): number {
  const res = mockResponse();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  errorHandler(err, mockRequest(), res, vi.fn());
  return res.status.mock.calls[0]![0];
}

describe('auth middleware', () => {
  it('responds 401 when the Authorization header is missing', () => {
    const { req, next } = run();

    const err = next.mock.calls[0]![0];
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(statusOf(err)).toBe(401);
    expect(req.user).toBeUndefined();
  });

  it('responds 401 when the token is invalid', () => {
    const forged = new JwtTokenService('another-secret', '1h').sign({ userId: 'user-1' });

    for (const header of ['Bearer not-a-jwt', `Bearer ${forged}`, 'Basic abc']) {
      const { req, next } = run(header);
      const err = next.mock.calls[0]![0];
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect(statusOf(err)).toBe(401);
      expect(req.user).toBeUndefined();
    }
  });

  it('sets req.user.id when the token is valid', () => {
    const token = tokens.sign({ userId: 'user-1' });

    const { req, next } = run(`Bearer ${token}`);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'user-1' });
  });
});
