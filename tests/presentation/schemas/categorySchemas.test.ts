import { describe, expect, it } from 'vitest';
import { createCategoryBodySchema, updateCategoryBodySchema } from '../../../src/presentation/schemas/categorySchemas';
import { idParamsSchema } from '../../../src/presentation/schemas/commonSchemas';

describe('category schemas', () => {
  it('strips isDefault and userId from the create body', () => {
    const result = createCategoryBodySchema.parse({ name: '  Viajes ', isDefault: true, userId: 'x' });

    expect(result).toEqual({ name: 'Viajes' });
  });

  it('rejects an empty name', () => {
    expect(createCategoryBodySchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('rejects an update body without fields', () => {
    expect(updateCategoryBodySchema.safeParse({}).success).toBe(false);
  });

  it('rejects an id that is not a UUID', () => {
    expect(idParamsSchema.safeParse({ id: '123' }).success).toBe(false);
  });
});
