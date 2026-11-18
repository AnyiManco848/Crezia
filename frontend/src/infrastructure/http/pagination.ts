import type { HttpResponse } from './client';

// The one shape every list screen receives, whatever the endpoint answers.
export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

function numberHeader(headers: Headers, name: string): number | undefined {
  const raw = headers.get(name);
  if (raw === null || raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

// Categories, bank accounts and goals: the body is an array and the pagination travels in the
// X-Total-Count, X-Page and X-Limit headers. If a header is missing, the page is taken as complete.
export function pageFromHeaders<T>(response: HttpResponse<T[]>): Page<T> {
  const items = response.data;
  return {
    items,
    total: numberHeader(response.headers, 'X-Total-Count') ?? items.length,
    page: numberHeader(response.headers, 'X-Page') ?? 1,
    limit: numberHeader(response.headers, 'X-Limit') ?? items.length,
  };
}

export interface BodyPage<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

// Movements: the body is { data, page, limit, total }.
export function pageFromBody<T>(response: HttpResponse<BodyPage<T>>): Page<T> {
  const { data, page, limit, total } = response.data;
  return { items: data, page, limit, total };
}

// Total number of pages (at least 1, so an empty list still reads "page 1 of 1").
export function pageCount(page: Pick<Page<unknown>, 'total' | 'limit'>): number {
  return Math.max(1, Math.ceil(page.total / Math.max(1, page.limit)));
}
