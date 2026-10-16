import { z } from 'zod';

const name = z
  .string({ error: 'El nombre es obligatorio' })
  .trim()
  .min(1, { error: 'El nombre es obligatorio' })
  .max(100, { error: 'El nombre no puede superar los 100 caracteres' });

const description = z
  .string({ error: 'La descripción debe ser un texto' })
  .trim()
  .max(255, { error: 'La descripción no puede superar los 255 caracteres' })
  .nullable();

// Unknown keys (isDefault, userId...) are stripped by z.object.
export const createCategoryBodySchema = z.object({
  name,
  description: description.optional(),
});

export const updateCategoryBodySchema = z
  .object({
    name: name.optional(),
    description: description.optional(),
  })
  .refine((body) => body.name !== undefined || body.description !== undefined, {
    error: 'Envía al menos el nombre o la descripción',
  });

export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>;
