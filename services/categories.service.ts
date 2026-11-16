import { APIRequestContext, APIResponse } from '@playwright/test';
import { CategoryPayload } from '../data/payloads';
import { authHeaders } from '../utils/headers';

export function createCategory(
  request: APIRequestContext,
  token: string | undefined,
  payload: CategoryPayload,
): Promise<APIResponse> {
  return request.post('/api/categories', { headers: authHeaders(token), data: payload });
}

export function deleteCategory(request: APIRequestContext, token: string, id: string): Promise<APIResponse> {
  return request.delete(`/api/categories/${id}`, { headers: authHeaders(token) });
}

export function getCategory(request: APIRequestContext, token: string, id: string): Promise<APIResponse> {
  return request.get(`/api/categories/${id}`, { headers: authHeaders(token) });
}

export function listCategories(
  request: APIRequestContext,
  token: string | undefined,
  query: Record<string, string | number> = {},
): Promise<APIResponse> {
  return request.get('/api/categories', { headers: authHeaders(token), params: query });
}
