import { z } from 'zod';
import { ACCOUNT_TYPES } from '../../domain/entities/BankAccount';

const bankName = z
  .string({ error: 'El nombre del banco es obligatorio' })
  .trim()
  .min(1, { error: 'El nombre del banco es obligatorio' })
  .max(100, { error: 'El nombre del banco no puede superar los 100 caracteres' });

const accountAlias = z
  .string({ error: 'El alias debe ser un texto' })
  .trim()
  .max(100, { error: 'El alias no puede superar los 100 caracteres' })
  .nullable();

const accountType = z.enum(ACCOUNT_TYPES, {
  error: `El tipo de cuenta debe ser uno de: ${ACCOUNT_TYPES.join(', ')}`,
});

// Only the format is checked here; whether the currency exists is checked by the use case.
const currencyCode = z
  .string({ error: 'La moneda es obligatoria' })
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, { error: 'La moneda debe ser un código de 3 letras (por ejemplo COP)' });

// Unknown keys (userId, balance, lastSyncedAt...) are stripped by z.object.
export const createBankAccountBodySchema = z.object({
  bankName,
  accountAlias: accountAlias.optional(),
  accountType,
  currencyCode,
});

export const updateBankAccountBodySchema = z
  .object({
    bankName: bankName.optional(),
    accountAlias: accountAlias.optional(),
    accountType: accountType.optional(),
    currencyCode: currencyCode.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    error: 'Envía al menos un campo para actualizar',
  });

export type CreateBankAccountBody = z.infer<typeof createBankAccountBodySchema>;
export type UpdateBankAccountBody = z.infer<typeof updateBankAccountBodySchema>;
