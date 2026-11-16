import { describe, expect, it } from 'vitest';
import { paginationQuerySchema } from '../../../src/presentation/schemas/commonSchemas';

describe('paginationQuerySchema', () => {
  it('defaults to page 1 and limit 50', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 50 });
  });

  it('coerces query strings to numbers', () => {
    expect(paginationQuerySchema.parse({ page: '3', limit: '100' })).toEqual({ page: 3, limit: 100 });
  });

  it.each([
    [{ limit: '101' }, 'limit'],
    [{ limit: '0' }, 'limit'],
    [{ limit: 'abc' }, 'limit'],
    [{ limit: '1.5' }, 'limit'],
    [{ page: '0' }, 'page'],
    [{ page: '-1' }, 'page'],
    [{ page: 'x' }, 'page'],
  ])('rejects %j', (query, field) => {
    const result = paginationQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });
});
