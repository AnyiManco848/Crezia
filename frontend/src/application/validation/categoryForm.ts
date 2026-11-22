import type { Category } from '../../domain/types';

export interface CategoryFormValues {
  name: string;
  description: string;
}

export type CategoryFormErrors = Partial<Record<keyof CategoryFormValues, string>>;

// Body of POST / PATCH /api/categories. An empty description is sent as null (the API accepts null, not "").
export interface CategoryPayload {
  name: string;
  description: string | null;
}

// Same limits as the backend schema (src/presentation/schemas/categorySchemas.ts).
export const MAX_CATEGORY_NAME = 100;
export const MAX_CATEGORY_DESCRIPTION = 255;

export function emptyCategoryForm(): CategoryFormValues {
  return { name: '', description: '' };
}

export function formFromCategory(category: Category): CategoryFormValues {
  return { name: category.name, description: category.description ?? '' };
}

export type CategoryFormResult = { ok: true; payload: CategoryPayload } | { ok: false; errors: CategoryFormErrors };

export function validateCategoryForm(values: CategoryFormValues): CategoryFormResult {
  const errors: CategoryFormErrors = {};
  const name = values.name.trim();
  const description = values.description.trim();

  if (name === '') errors.name = 'El nombre es obligatorio';
  else if (name.length > MAX_CATEGORY_NAME) errors.name = `El nombre no puede superar los ${MAX_CATEGORY_NAME} caracteres`;
  if (description.length > MAX_CATEGORY_DESCRIPTION) {
    errors.description = `La descripción no puede superar los ${MAX_CATEGORY_DESCRIPTION} caracteres`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, payload: { name, description: description === '' ? null : description } };
}

export const CATEGORY_FORM_FIELDS: readonly (keyof CategoryFormValues)[] = ['name', 'description'];
