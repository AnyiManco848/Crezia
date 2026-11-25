export const NETWORK_ERROR_MESSAGE = 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
export const UNEXPECTED_ERROR_MESSAGE = 'Ocurrió un error inesperado. Inténtalo de nuevo.';

export interface ApiErrorDetail {
  path: string;
  message: string;
}

// An error answered by the API: { error: { code, message, details? } } (see the backend errorHandler).
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
    // Seconds from the Retry-After header of a 429. null when the header is missing or the browser could not read it
    // (a cross-origin response only shows the headers the API exposes through CORS).
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  // Backend validation details keyed by field name: "body.email" -> "email". The first message wins.
  fieldErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const { path, message } of this.details) {
      const field = path.replace(/^(body|query|params)\./, '');
      if (!(field in result)) result[field] = message;
    }
    return result;
  }
}

// The request never got an answer (server down, no connection, CORS blocked).
export class NetworkError extends Error {
  constructor() {
    super(NETWORK_ERROR_MESSAGE);
    this.name = 'NetworkError';
  }
}

// A message in Spanish that is always safe to show to the user.
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof NetworkError) return error.message;
  return UNEXPECTED_ERROR_MESSAGE;
}
