import { z } from 'zod';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../application/movements/ListMovementsUseCase';
import { INVALID_AMOUNT_MESSAGE } from '../../application/movements/movementAccess';
import { MOVEMENT_TYPES, PAYMENT_METHODS } from '../../domain/entities/Movement';

// NUMERIC(14,2): up to 12 integer digits and 2 decimals.
const AMOUNT_FORMAT = /^\d{1,12}(?:\.\d{1,2})?$/;

// Accepts 85000 or "85000.50" and hands the use case a decimal string, so no float reaches the database.
const amount = z
  .union([z.number(), z.string()], { error: 'El monto es obligatorio y debe ser un número' })
  .transform((value) => String(value).trim())
  .pipe(
    z
      .string()
      .regex(/^-?\d+(?:\.\d+)?$/, { error: 'El monto debe ser un número', abort: true })
      .refine((value) => Number(value) > 0, { error: INVALID_AMOUNT_MESSAGE, abort: true })
      .regex(AMOUNT_FORMAT, { error: 'El monto admite hasta 12 dígitos enteros y 2 decimales' }),
  );

const type = z.enum(MOVEMENT_TYPES, { error: `El tipo debe ser uno de: ${MOVEMENT_TYPES.join(', ')}` });

const paymentMethod = z.enum(PAYMENT_METHODS, {
  error: `El método de pago debe ser uno de: ${PAYMENT_METHODS.join(', ')}`,
});

const categoryId = z.uuid({ error: 'La categoría es obligatoria y debe ser un UUID válido' });

const bankAccountId = z.uuid({ error: 'La cuenta bancaria debe ser un UUID válido' }).nullable();

// Same format as bank accounts; whether it matches the account is checked by the use case.
const currencyCode = z
  .string({ error: 'La moneda debe ser un texto' })
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, { error: 'La moneda debe ser un código de 3 letras (por ejemplo COP)' });

const date = z.iso.date({ error: 'La fecha debe tener el formato AAAA-MM-DD' });

const description = z
  .string({ error: 'La descripción debe ser un texto' })
  .trim()
  .max(255, { error: 'La descripción no puede superar los 255 caracteres' })
  .nullable();

// Unknown keys (userId, source, createdBy...) are stripped by z.object.
export const createMovementBodySchema = z.object({
  bankAccountId: bankAccountId.optional(),
  categoryId,
  type,
  amount,
  currencyCode: currencyCode.optional(),
  date,
  paymentMethod,
  description: description.optional(),
});

export const updateMovementBodySchema = z
  .object({
    bankAccountId: bankAccountId.optional(),
    categoryId: categoryId.optional(),
    type: type.optional(),
    amount: amount.optional(),
    currencyCode: currencyCode.optional(),
    date: date.optional(),
    paymentMethod: paymentMethod.optional(),
    description: description.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    error: 'Envía al menos un campo para actualizar',
  });

// Query values arrive as strings, so page and limit are coerced.
export const listMovementsQuerySchema = z
  .object({
    type: type.optional(),
    categoryId: z.uuid({ error: 'categoryId debe ser un UUID válido' }).optional(),
    bankAccountId: z.uuid({ error: 'bankAccountId debe ser un UUID válido' }).optional(),
    from: date.optional(),
    to: date.optional(),
    page: z.coerce
      .number({ error: 'page debe ser un número' })
      .int({ error: 'page debe ser un entero' })
      .min(1, { error: 'page debe ser mayor o igual a 1' })
      .default(DEFAULT_PAGE),
    limit: z.coerce
      .number({ error: 'limit debe ser un número' })
      .int({ error: 'limit debe ser un entero' })
      .min(1, { error: 'limit debe ser mayor o igual a 1' })
      .max(MAX_LIMIT, { error: `limit no puede ser mayor a ${MAX_LIMIT}` })
      .default(DEFAULT_LIMIT),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    error: 'La fecha "from" no puede ser posterior a "to"',
    path: ['to'],
  });

export type CreateMovementBody = z.infer<typeof createMovementBodySchema>;
export type UpdateMovementBody = z.infer<typeof updateMovementBodySchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
