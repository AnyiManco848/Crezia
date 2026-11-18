import { describe, expect, it } from 'vitest';
import type { HttpResponse } from './client';
import { pageCount, pageFromBody, pageFromHeaders, type BodyPage } from './pagination';

function response<T>(data: T, headers: Record<string, string> = {}): HttpResponse<T> {
  return { data, status: 200, headers: new Headers(headers) };
}

describe('pageFromHeaders (categories, accounts, goals)', () => {
  it('reads total, page and limit from the headers', () => {
    const page = pageFromHeaders(response(['a', 'b'], { 'X-Total-Count': '57', 'X-Page': '2', 'X-Limit': '20' }));

    expect(page).toEqual({ items: ['a', 'b'], total: 57, page: 2, limit: 20 });
  });

  it('takes the list as one complete page when the headers are missing', () => {
    const page = pageFromHeaders(response(['a', 'b', 'c']));

    expect(page).toEqual({ items: ['a', 'b', 'c'], total: 3, page: 1, limit: 3 });
  });

  it('ignores headers that are not numbers', () => {
    const page = pageFromHeaders(response(['a'], { 'X-Total-Count': 'abc', 'X-Page': '', 'X-Limit': '10' }));

    expect(page).toEqual({ items: ['a'], total: 1, page: 1, limit: 10 });
  });

  it('keeps an empty page beyond the last one with the real total', () => {
    const page = pageFromHeaders(response([], { 'X-Total-Count': '57', 'X-Page': '9', 'X-Limit': '20' }));

    expect(page).toEqual({ items: [], total: 57, page: 9, limit: 20 });
  });
});

describe('pageFromBody (movements)', () => {
  it('renames data to items and keeps the rest', () => {
    const body: BodyPage<string> = { data: ['m1', 'm2'], page: 3, limit: 20, total: 45 };

    expect(pageFromBody(response(body))).toEqual({ items: ['m1', 'm2'], page: 3, limit: 20, total: 45 });
  });

  it('gives the same shape as the header adapter', () => {
    const fromBody = pageFromBody(response({ data: ['x'], page: 1, limit: 50, total: 1 }));
    const fromHeaders = pageFromHeaders(response(['x'], { 'X-Total-Count': '1', 'X-Page': '1', 'X-Limit': '50' }));

    expect(fromBody).toEqual(fromHeaders);
  });
});

describe('pageCount', () => {
  it('rounds up and is at least 1', () => {
    expect(pageCount({ total: 57, limit: 20 })).toBe(3);
    expect(pageCount({ total: 60, limit: 20 })).toBe(3);
    expect(pageCount({ total: 0, limit: 20 })).toBe(1);
    expect(pageCount({ total: 5, limit: 0 })).toBe(5);
  });
});
