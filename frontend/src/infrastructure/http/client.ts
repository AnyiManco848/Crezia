import { ApiError, NetworkError, UNEXPECTED_ERROR_MESSAGE, type ApiErrorDetail } from './errors';

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
  // false for public endpoints (login): no token is sent and a 401 does not end the session.
  auth?: boolean;
  signal?: AbortSignal;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export interface HttpClientOptions {
  baseUrl: string;
  getToken: () => string | null;
  // Called on any 401 of an authenticated request: the session is no longer valid.
  onUnauthorized: () => void;
  fetchImpl?: typeof fetch;
}

type CallOptions = Omit<RequestOptions, 'body'>;

export interface HttpClient {
  get<T>(path: string, options?: CallOptions): Promise<HttpResponse<T>>;
  post<T>(path: string, body?: unknown, options?: CallOptions): Promise<HttpResponse<T>>;
  patch<T>(path: string, body?: unknown, options?: CallOptions): Promise<HttpResponse<T>>;
  delete<T>(path: string, options?: CallOptions): Promise<HttpResponse<T>>;
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const search = params.toString();
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}${search ? `?${search}` : ''}`;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// Retry-After is either a number of seconds or an HTTP date. Anything else (or no header) is null.
export function parseRetryAfter(raw: string | null, now: number = Date.now()): number | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  // Date.parse accepts odd things such as "-5"; a real HTTP date always has letters (day and month names).
  const date = /[A-Za-z]/.test(value) ? Date.parse(value) : Number.NaN;
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - now) / 1000));
}

function toApiError(status: number, payload: unknown, headers: Headers): ApiError {
  const error = (payload as { error?: { code?: unknown; message?: unknown; details?: unknown } } | undefined)?.error;
  const message = typeof error?.message === 'string' && error.message ? error.message : UNEXPECTED_ERROR_MESSAGE;
  const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN';
  const details = Array.isArray(error?.details) ? (error.details as ApiErrorDetail[]) : [];
  const retryAfter = status === 429 ? parseRetryAfter(headers.get('Retry-After')) : null;
  return new ApiError(status, code, message, details, retryAfter);
}

export function createHttpClient({ baseUrl, getToken, onUnauthorized, fetchImpl }: HttpClientOptions): HttpClient {
  // Called through a lambda so `this` stays the window (a detached fetch throws "Illegal invocation").
  const doFetch: typeof fetch = fetchImpl ?? ((input, init) => fetch(input, init));

  async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    const { query, body, auth = true, signal } = options;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await doFetch(buildUrl(baseUrl, path, query), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new NetworkError();
    }

    const payload = await readJson(response);

    if (!response.ok) {
      if (response.status === 401 && auth) onUnauthorized();
      throw toApiError(response.status, payload, response.headers);
    }

    return { data: payload as T, status: response.status, headers: response.headers };
  }

  return {
    get: (path, options) => request('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body }),
    patch: (path, body, options) => request('PATCH', path, { ...options, body }),
    delete: (path, options) => request('DELETE', path, options),
  };
}
