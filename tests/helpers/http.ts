import type { Request, Response } from 'express';
import { vi } from 'vitest';

export function mockRequest(overrides: Partial<Request> = {}): Request {
  return { headers: {}, body: {}, params: {}, query: {}, method: 'GET', path: '/', ...overrides } as Request;
}

export function mockResponse() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as typeof res & Response;
}
