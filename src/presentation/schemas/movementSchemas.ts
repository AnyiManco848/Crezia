import { z } from 'zod';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../application/movements/ListMovementsUseCase';
import {
  DEFAULT_SUMMARY_CURRENCY,
  INVALID_PERIOD_MESSAGE,
  MAX_PERIOD_DAYS,
  PERIOD_TOO_LONG_MESSAGE,
  periodDays,
} from '../../application/movements/GetMovementSummaryUseCase';
import { INVALID_AMOUNT_MESSAGE } from '../../application/movements/movementAccess';
import { MOVEMENT_TYPES, PAYMENT_METHODS } from '../../domain/entities/Movement';
import { positiveAmountSchema } from './commonSchemas';

const amount = positiveAmountSchema('El monto', INVALID_AMOUNT_MESSAGE);

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

// Both dates are required, so "this month" does not depend on the server's time zone: the client sends the range.
// The currency defaults to COP; the use case repeats the default and the period checks.
export const movementSummaryQuerySchema = z
  .object({
    from: date,
    to: date,
    currencyCode: currencyCode.default(DEFAULT_SUMMARY_CURRENCY),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    error: INVALID_PERIOD_MESSAGE,
    path: ['to'],
  })
  .refine((query) => !query.from || !query.to || query.from > query.to || periodDays(query.from, query.to) <= MAX_PERIOD_DAYS, {
    error: PERIOD_TOO_LONG_MESSAGE,
    path: ['to'],
  });

export type CreateMovementBody = z.infer<typeof createMovementBodySchema>;
export type MovementSummaryQuery = z.infer<typeof movementSummaryQuerySchema>;
export type UpdateMovementBody = z.infer<typeof updateMovementBodySchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
