import { APIRequestContext, APIResponse } from '@playwright/test';

export interface LoginPayload {
  email?: string;
  password?: string;
}

export function login(request: APIRequestContext, credentials: LoginPayload): Promise<APIResponse> {
  return request.post('/api/auth/login', { data: credentials });
}
