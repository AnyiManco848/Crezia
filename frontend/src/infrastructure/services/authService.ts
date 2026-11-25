import type { RegisterPayload } from '../../application/validation/registerSchema';
import type { Session } from '../../domain/types';
import type { HttpClient } from '../http/client';
import { http } from '../http';

export interface Credentials {
  email: string;
  password: string;
}

export function createAuthService(client: HttpClient) {
  return {
    // POST /api/auth/login -> { token, user }
    async login(credentials: Credentials, signal?: AbortSignal): Promise<Session> {
      const response = await client.post<Session>('/api/auth/login', credentials, { auth: false, signal });
      return { token: response.data.token, user: response.data.user };
    },

    // POST /api/auth/register -> 201 { token, user }, the same session the login gives. Public: no token is sent and a
    // 401 would not end any session. Possible errors: 400 (fields), 409 (generic message, on purpose), 429 (Retry-After).
    async register(payload: RegisterPayload, signal?: AbortSignal): Promise<Session> {
      const response = await client.post<Session>('/api/auth/register', payload, { auth: false, signal });
      return { token: response.data.token, user: response.data.user };
    },
  };
}

export const authService = createAuthService(http);
