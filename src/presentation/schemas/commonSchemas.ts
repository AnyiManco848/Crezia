import { z } from 'zod';
import { DEFAULT_LIST_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../application/pagination';

export const idParamsSchema = z.object({
  id: z.uuid({ error: 'El id no es un UUID válido' }),
});

export type IdParams = z.infer<typeof idParamsSchema>;

// NUMERIC(14,2): up to 12 integer digits and 2 decimals.
const AMOUNT_FORMAT = /^\d{1,12}(?:\.\d{1,2})?$/;

// Accepts 85000 or "85000.50" and hands the use case a decimal string, so no float reaches the database.
// label is the field name as the user reads it (e.g. "El monto").
export function positiveAmountSchema(label: string, positiveMessage: string) {
  return z
    .union([z.number(), z.string()], { error: `${label} es obligatorio y debe ser un número` })
    .transform((value) => String(value).trim())
    .pipe(
      z
        .string()
        .regex(/^-?\d+(?:\.\d+)?$/, { error: `${label} debe ser un número`, abort: true })
        .refine((value) => Number(value) > 0, { error: positiveMessage, abort: true })
        .regex(AMOUNT_FORMAT, { error: `${label} admite hasta 12 dígitos enteros y 2 decimales` }),
    );
}

// Query of the array-bodied lists. Values arrive as strings, so page and limit are coerced.
export const paginationQuerySchema = z.object({
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
    .default(DEFAULT_LIST_LIMIT),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
