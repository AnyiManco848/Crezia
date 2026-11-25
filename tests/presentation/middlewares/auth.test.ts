import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '../../../src/domain/errors';
import { JwtTokenService } from '../../../src/infrastructure/security/JwtTokenService';
import { authenticate, INVALID_TOKEN_MESSAGE } from '../../../src/presentation/middlewares/auth';
import { errorHandler } from '../../../src/presentation/middlewares/errorHandler';
import { mockRequest, mockResponse } from '../../helpers/http';

const tokens = new JwtTokenService('test-secret', '1h');

async function run(authorization?: string, isActive: (id: string) => Promise<boolean> = async () => true) {
  const req = mockRequest({ headers: authorization ? { authorization } : {} });
  const res = mockResponse();
  const next = vi.fn();
  const users = { isActive: vi.fn(isActive) };
  await authenticate(tokens, users)(req, res, next);
  return { req, res, next, users };
}

// Passes whatever the middleware forwarded through the real error handler to get the HTTP status and body.
function responseOf(err: unknown) {
  const res = mockResponse();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  errorHandler(err, mockRequest(), res, vi.fn());
  return { status: res.status.mock.calls[0]![0] as number, body: res.json.mock.calls[0]![0] };
}

describe('authenticate middleware', () => {
  it('responds 401 when the Authorization header is missing, without querying users', async () => {
    const { req, next, users } = await run();

    const err = next.mock.calls[0]![0];
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(responseOf(err).status).toBe(401);
    expect(req.user).toBeUndefined();
    expect(users.isActive).not.toHaveBeenCalled();
  });

  it('responds 401 when the token is invalid, without querying users', async () => {
    const forged = new JwtTokenService('another-secret', '1h').sign({ userId: 'user-1' });

    for (const header of ['Bearer not-a-jwt', `Bearer ${forged}`, 'Basic abc']) {
      const { req, next, users } = await run(header);
      const err = next.mock.calls[0]![0];
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect(responseOf(err).status).toBe(401);
      expect(req.user).toBeUndefined();
      expect(users.isActive).not.toHaveBeenCalled();
    }
  });

  it('sets req.user.id when the token is valid and the user is active', async () => {
    const token = tokens.sign({ userId: 'user-1' });

    const { req, next, users } = await run(`Bearer ${token}`);

    expect(users.isActive).toHaveBeenCalledWith('user-1');
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'user-1' });
  });

  it('responds 401 with the same message as an invalid token when the user is no longer active (DEF-010)', async () => {
    const token = tokens.sign({ userId: 'user-1' });
    const invalid = await run('Bearer not-a-jwt');

    const { req, next } = await run(`Bearer ${token}`, async () => false);

    const err = next.mock.calls[0]![0];
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(responseOf(err).status).toBe(401);
    expect(err.message).toBe(INVALID_TOKEN_MESSAGE);
    expect(responseOf(err).body).toEqual(responseOf(invalid.next.mock.calls[0]![0]).body);
    expect(req.user).toBeUndefined();
  });

  it('forwards a repository failure as an error (never lets the request through)', async () => {
    const token = tokens.sign({ userId: 'user-1' });

    const { req, next } = await run(`Bearer ${token}`, async () => {
      throw new Error('database down');
    });

    expect(next.mock.calls[0]![0]).toBeInstanceOf(Error);
    expect(req.user).toBeUndefined();
  });
});
