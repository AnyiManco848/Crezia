import { APIRequestContext, APIResponse } from '@playwright/test';
import { BankAccountPayload } from '../data/payloads';
import { authHeaders } from '../utils/headers';

export function createBankAccount(
  request: APIRequestContext,
  token: string | undefined,
  payload: BankAccountPayload,
): Promise<APIResponse> {
  return request.post('/api/bank-accounts', { headers: authHeaders(token), data: payload });
}

export function deleteBankAccount(request: APIRequestContext, token: string, id: string): Promise<APIResponse> {
  return request.delete(`/api/bank-accounts/${id}`, { headers: authHeaders(token) });
}

export function getBankAccount(request: APIRequestContext, token: string, id: string): Promise<APIResponse> {
  return request.get(`/api/bank-accounts/${id}`, { headers: authHeaders(token) });
}
