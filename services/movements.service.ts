import { APIRequestContext, APIResponse } from '@playwright/test';
import { MovementPayload } from '../data/payloads';
import { authHeaders } from '../utils/headers';

export function createMovement(
  request: APIRequestContext,
  token: string | undefined,
  payload: MovementPayload,
): Promise<APIResponse> {
  return request.post('/api/movements', { headers: authHeaders(token), data: payload });
}

export function deleteMovement(request: APIRequestContext, token: string, id: string): Promise<APIResponse> {
  return request.delete(`/api/movements/${id}`, { headers: authHeaders(token) });
}

export function getMovement(request: APIRequestContext, token: string, id: string): Promise<APIResponse> {
  return request.get(`/api/movements/${id}`, { headers: authHeaders(token) });
}
