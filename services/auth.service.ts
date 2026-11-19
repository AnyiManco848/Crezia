import { APIRequestContext, APIResponse } from '@playwright/test';
import type { RegisterPayload } from '../data/registration';

export interface LoginPayload {
  email?: string;
  password?: string;
}

export function login(request: APIRequestContext, credentials: LoginPayload): Promise<APIResponse> {
  return request.post('/api/auth/login', { data: credentials });
}

export function register(request: APIRequestContext, payload: RegisterPayload): Promise<APIResponse> {
  return request.post('/api/auth/register', { data: payload });
}
