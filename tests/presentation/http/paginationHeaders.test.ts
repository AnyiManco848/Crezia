import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { PAGINATION_HEADERS, sendPage } from '../../../src/presentation/http/paginationHeaders';

describe('sendPage', () => {
  it('sends the plain array as body and the metadata in the headers', () => {
    const res = { set: vi.fn(), json: vi.fn() };

    sendPage(res as unknown as Response, { data: [{ id: 'a' }], page: 2, limit: 10, total: 21 });

    expect(res.set).toHaveBeenCalledWith({ 'X-Total-Count': '21', 'X-Page': '2', 'X-Limit': '10' });
    expect(res.json).toHaveBeenCalledWith([{ id: 'a' }]);
  });

  it('lists the headers to expose through CORS', () => {
    expect(PAGINATION_HEADERS).toEqual(['X-Total-Count', 'X-Page', 'X-Limit']);
  });
});
