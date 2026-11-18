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
  };
}

export const authService = createAuthService(http);
