import { describe, expect, it, vi } from 'vitest';
import { createHttpClient, parseRetryAfter } from './client';
import { ApiError, getErrorMessage, NETWORK_ERROR_MESSAGE, NetworkError, UNEXPECTED_ERROR_MESSAGE } from './errors';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function setup(fetchImpl: typeof fetch, token: string | null = 'tok-123') {
  const onUnauthorized = vi.fn();
  const client = createHttpClient({ baseUrl: 'http://api.test', getToken: () => token, onUnauthorized, fetchImpl });
  return { client, onUnauthorized };
}

describe('http client', () => {
  it('sends the bearer token and builds the query string without empty values', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([]));
    const { client } = setup(fetchImpl);

    await client.get('/api/movements', { query: { page: 2, type: 'Income', from: '', to: undefined, categoryId: null } });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('http://api.test/api/movements?page=2&type=Income');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
  });

  it('sends a JSON body with the content type', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ id: '1' }, 201));
    const { client } = setup(fetchImpl);

    const response = await client.post('/api/goals', { name: 'Viaje' });

    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init!.method).toBe('POST');
    expect(init!.body).toBe('{"name":"Viaje"}');
    expect((init!.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(response.status).toBe(201);
    expect(response.data).toEqual({ id: '1' });
  });

  it('exposes the response headers (pagination)', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([], 200, { 'X-Total-Count': '57' }));
    const { client } = setup(fetchImpl);

    const response = await client.get('/api/categories');

    expect(response.headers.get('X-Total-Count')).toBe('57');
  });

  it('does not send the token on public requests and does not end the session on their 401', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Correo o contraseña incorrectos' } }, 401));
    const { client, onUnauthorized } = setup(fetchImpl);

    await expect(client.post('/api/auth/login', { email: 'a@b.co' }, { auth: false })).rejects.toMatchObject({
      status: 401,
      message: 'Correo o contraseña incorrectos',
    });

    const [, init] = fetchImpl.mock.calls[0]!;
    expect((init!.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('ends the session on any 401 of an authenticated request', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'No autorizado' } }, 401));
    const { client, onUnauthorized } = setup(fetchImpl);

    await expect(client.get('/api/goals')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('turns a validation error into an ApiError with field errors', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Los datos enviados no son válidos',
            details: [
              { path: 'body.email', message: 'El correo no es válido' },
              { path: 'body.email', message: 'otro' },
              { path: 'query.page', message: 'page debe ser un entero' },
            ],
          },
        },
        400,
      ),
    );
    const { client, onUnauthorized } = setup(fetchImpl);

    const error = await client.post('/api/auth/login', {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('VALIDATION_ERROR');
    expect((error as ApiError).fieldErrors()).toEqual({ email: 'El correo no es válido', page: 'page debe ser un entero' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('uses a generic Spanish message when the error body is not the API format', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    const { client } = setup(fetchImpl);

    const error = await client.get('/api/goals').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 502, code: 'UNKNOWN', message: UNEXPECTED_ERROR_MESSAGE });
  });

  it('turns a failed connection into a NetworkError in Spanish', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    const { client } = setup(fetchImpl);

    const error = await client.get('/api/goals').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect(getErrorMessage(error)).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('lets an aborted request through untouched', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(abort);
    const { client } = setup(fetchImpl);

    await expect(client.get('/api/goals')).rejects.toBe(abort);
  });

  it('accepts an empty success body', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const { client } = setup(fetchImpl);

    const response = await client.delete('/api/goals/1');

    expect(response.data).toBeUndefined();
  });
});

describe('getErrorMessage', () => {
  it('never leaks an unknown error message', () => {
    expect(getErrorMessage(new Error('secret stack detail'))).toBe(UNEXPECTED_ERROR_MESSAGE);
    expect(getErrorMessage('boom')).toBe(UNEXPECTED_ERROR_MESSAGE);
  });
});

describe('Retry-After on a 429', () => {
  const tooMany = (headers: Record<string, string> = {}) =>
    jsonResponse({ error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.' } }, 429, headers);

  it('reads the number of seconds into the ApiError', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(tooMany({ 'Retry-After': '42' }));
    const { client } = setup(fetchImpl);

    const error = await client.post('/api/auth/register', {}, { auth: false }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(429);
    expect((error as ApiError).retryAfterSeconds).toBe(42);
  });

  it('is null when the header is missing or unreadable (CORS does not expose it)', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(tooMany());
    const { client } = setup(fetchImpl);

    const error = await client.post('/api/auth/register', {}, { auth: false }).catch((e: unknown) => e);

    expect((error as ApiError).retryAfterSeconds).toBeNull();
  });

  it('is only read on a 429', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ error: { code: 'CONFLICT', message: 'x' } }, 409, { 'Retry-After': '5' }));
    const { client } = setup(fetchImpl);

    const error = await client.post('/api/auth/register', {}, { auth: false }).catch((e: unknown) => e);

    expect((error as ApiError).retryAfterSeconds).toBeNull();
  });
});

describe('parseRetryAfter', () => {
  it('accepts seconds and HTTP dates and rejects anything else', () => {
    expect(parseRetryAfter('120')).toBe(120);
    expect(parseRetryAfter(' 7 ')).toBe(7);
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:30 GMT', Date.parse('Wed, 21 Oct 2026 07:28:00 GMT'))).toBe(30);
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:30 GMT', Date.parse('Thu, 22 Oct 2026 07:28:00 GMT'))).toBe(0);
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter('')).toBeNull();
    expect(parseRetryAfter('pronto')).toBeNull();
    expect(parseRetryAfter('-5')).toBeNull();
  });
});
