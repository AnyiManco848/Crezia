import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../http/errors';
import { createHttpClient } from '../http/client';
import { createAuthService } from './authService';

const SESSION = { token: 'jwt', user: { id: 'u1', name: 'Camila', email: 'camila@crezia.com' } };

function serviceWith(response: Response) {
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response);
  const onUnauthorized = vi.fn();
  const client = createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'old-token', onUnauthorized, fetchImpl });
  return { fetchImpl, onUnauthorized, service: createAuthService(client) };
}

const payload = { name: 'Camila', documentId: '100', birthDate: '1995-03-10', email: 'camila@crezia.com', phone: null, password: 'Clave1234' };

describe('authService.register', () => {
  it('posts the payload without a token and returns the session of the 201', async () => {
    const { fetchImpl, service } = serviceWith(new Response(JSON.stringify(SESSION), { status: 201 }));

    const session = await service.register(payload);

    expect(fetchImpl.mock.calls[0]![0]).toBe('http://api.test/api/auth/register');
    const init = fetchImpl.mock.calls[0]![1]!;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(session).toEqual(SESSION);
  });

  it('lets the 409 through as an ApiError with the generic message', async () => {
    const { service } = serviceWith(new Response(JSON.stringify({ error: { code: 'CONFLICT', message: 'No pudimos crear la cuenta con esos datos.' } }), { status: 409 }));

    const error = await service.register(payload).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
  });

  it('does not end a session on a 401 (public endpoint)', async () => {
    const { onUnauthorized, service } = serviceWith(new Response('{}', { status: 401 }));

    await service.register(payload).catch(() => undefined);

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
