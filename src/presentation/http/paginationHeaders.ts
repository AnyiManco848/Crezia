import type { Response } from 'express';
import type { PageInfo } from '../../application/pagination';

// Headers exposed through cors({ exposedHeaders }) so browser clients can read them.
export const PAGINATION_HEADERS = ['X-Total-Count', 'X-Page', 'X-Limit'] as const;

// The body stays a plain array; the pagination metadata travels in the headers.
export function sendPage<T>(res: Response, { data, page, limit, total }: PageInfo & { data: T[] }): void {
  res.set({ 'X-Total-Count': String(total), 'X-Page': String(page), 'X-Limit': String(limit) });
  res.json(data);
}
