import type { Page } from '../domain/pagination';

export const DEFAULT_PAGE = 1;
export const MAX_LIMIT = 100;
// Default page size of the array-bodied lists (bank accounts, goals, categories).
export const DEFAULT_LIST_LIMIT = 50;

export interface PageParams {
  page?: number;
  limit?: number;
}

export interface PageInfo {
  page: number;
  limit: number;
  total: number;
}

export interface PagedResult<T> extends PageInfo {
  data: T[];
}

// The query schema already applies the defaults and bounds; they are repeated so the use cases are safe on their own.
export function normalizePage({ page, limit }: PageParams, defaultLimit = DEFAULT_LIST_LIMIT) {
  const safePage = Math.max(DEFAULT_PAGE, Math.trunc(page ?? DEFAULT_PAGE));
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit ?? defaultLimit)));
  return { page: safePage, limit: safeLimit, pagination: { skip: (safePage - 1) * safeLimit, take: safeLimit } };
}

export function toPagedResult<T>({ data, total }: Page<T>, page: number, limit: number): PagedResult<T> {
  return { data, page, limit, total };
}
