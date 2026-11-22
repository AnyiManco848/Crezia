import { describe, expect, it } from 'vitest';
import { emptyCategoryForm, formFromCategory, validateCategoryForm } from './categoryForm';

describe('validateCategoryForm', () => {
  it('requires the name', () => {
    expect(validateCategoryForm(emptyCategoryForm())).toEqual({ ok: false, errors: { name: 'El nombre es obligatorio' } });
    expect(validateCategoryForm({ name: '   ', description: '' })).toEqual({ ok: false, errors: { name: 'El nombre es obligatorio' } });
  });

  it('trims the values and sends an empty description as null', () => {
    expect(validateCategoryForm({ name: '  Mercado ', description: '   ' })).toEqual({
      ok: true,
      payload: { name: 'Mercado', description: null },
    });
    expect(validateCategoryForm({ name: 'Mercado', description: ' Compras del mes ' })).toEqual({
      ok: true,
      payload: { name: 'Mercado', description: 'Compras del mes' },
    });
  });

  it('accepts the maximum lengths and rejects one more', () => {
    expect(validateCategoryForm({ name: 'a'.repeat(100), description: 'b'.repeat(255) }).ok).toBe(true);

    const result = validateCategoryForm({ name: 'a'.repeat(101), description: 'b'.repeat(256) });
    expect(result).toEqual({
      ok: false,
      errors: {
        name: 'El nombre no puede superar los 100 caracteres',
        description: 'La descripción no puede superar los 255 caracteres',
      },
    });
  });

  it('fills the form from a category (null description becomes empty)', () => {
    expect(formFromCategory({ id: 'c1', userId: 'u1', name: 'Mercado', description: null })).toEqual({ name: 'Mercado', description: '' });
  });
});
