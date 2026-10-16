import { z } from 'zod';
import { INVALID_TARGET_AMOUNT_MESSAGE } from '../../application/goals/goalAccess';
import { GOAL_REASONS, GOAL_STATUSES } from '../../domain/entities/Goal';
import { positiveAmountSchema } from './commonSchemas';

const categoryId = z.uuid({ error: 'La categoría es obligatoria y debe ser un UUID válido' });

const name = z
  .string({ error: 'El nombre es obligatorio' })
  .trim()
  .min(1, { error: 'El nombre es obligatorio' })
  .max(100, { error: 'El nombre no puede superar los 100 caracteres' });

const reason = z.enum(GOAL_REASONS, { error: `El motivo debe ser uno de: ${GOAL_REASONS.join(', ')}` });

// An empty text counts as no description; whether it is required depends on reason (checked by the use case).
const reasonOther = z
  .string({ error: 'El motivo personalizado debe ser un texto' })
  .trim()
  .max(255, { error: 'El motivo personalizado no puede superar los 255 caracteres' })
  .transform((value) => value || null)
  .nullable();

const targetAmount = positiveAmountSchema('El monto objetivo', INVALID_TARGET_AMOUNT_MESSAGE);

// Same format as bank accounts; whether the currency exists is checked by the use case.
const currencyCode = z
  .string({ error: 'La moneda es obligatoria' })
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, { error: 'La moneda debe ser un código de 3 letras (por ejemplo COP)' });

const startDate = z.iso.date({ error: 'La fecha inicio es obligatoria y debe tener el formato AAAA-MM-DD' });
const endDate = z.iso.date({ error: 'La fecha fin es obligatoria y debe tener el formato AAAA-MM-DD' });

const status = z.enum(GOAL_STATUSES, { error: `El estado debe ser uno de: ${GOAL_STATUSES.join(', ')}` });

// Unknown keys (userId, status, progress...) are stripped by z.object: a new goal always starts Active.
export const createGoalBodySchema = z.object({
  categoryId,
  name,
  reason,
  reasonOther: reasonOther.optional(),
  targetAmount,
  currencyCode,
  startDate,
  endDate,
});

export const updateGoalBodySchema = z
  .object({
    categoryId: categoryId.optional(),
    name: name.optional(),
    reason: reason.optional(),
    reasonOther: reasonOther.optional(),
    targetAmount: targetAmount.optional(),
    currencyCode: currencyCode.optional(),
    startDate: startDate.optional(),
    endDate: endDate.optional(),
    status: status.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    error: 'Envía al menos un campo para actualizar',
  });

export type CreateGoalBody = z.infer<typeof createGoalBodySchema>;
export type UpdateGoalBody = z.infer<typeof updateGoalBodySchema>;
