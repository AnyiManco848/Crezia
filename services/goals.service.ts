import { APIRequestContext, APIResponse } from '@playwright/test';
import { GoalPayload } from '../data/payloads';
import { authHeaders } from '../utils/headers';

export function createGoal(
  request: APIRequestContext,
  token: string | undefined,
  payload: GoalPayload,
): Promise<APIResponse> {
  return request.post('/api/goals', { headers: authHeaders(token), data: payload });
}

export function deleteGoal(request: APIRequestContext, token: string, id: string): Promise<APIResponse> {
  return request.delete(`/api/goals/${id}`, { headers: authHeaders(token) });
}

export function getGoal(request: APIRequestContext, token: string, id: string): Promise<APIResponse> {
  return request.get(`/api/goals/${id}`, { headers: authHeaders(token) });
}

export function listGoals(
  request: APIRequestContext,
  token: string | undefined,
  query: Record<string, string | number> = {},
): Promise<APIResponse> {
  return request.get('/api/goals', { headers: authHeaders(token), params: query });
}
