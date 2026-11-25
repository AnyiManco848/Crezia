import { z } from 'zod';
import { isAdult, UNDERAGE_MESSAGE } from '../../domain/entities/User';

export const loginBodySchema = z.object({
  // Same normalization as the registration (trim + lowercase), so the email is found whatever the capitalization (D-4).
  email: z
    .string({ error: 'El correo es obligatorio' })
    .trim()
    .pipe(z.email({ error: 'El correo no es válido' }))
    .transform((value) => value.toLowerCase()),
  password: z.string({ error: 'La contraseña es obligatoria' }).min(1, { error: 'La contraseña es obligatoria' }),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

// ---- Registration (AUTH-REG-001) ----
const REQUIRED = (field: string) => ({ error: `${field} es obligatorio` });

// "YYYY-MM-DD" that is a real calendar date (rejects 2026-02-30).
function isRealCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export const registerBodySchema = z
  .object({
    name: z
      .string(REQUIRED('El nombre'))
      .trim()
      .min(2, { error: 'El nombre debe tener al menos 2 caracteres' })
      .max(120, { error: 'El nombre no puede superar 120 caracteres' }),
    documentId: z
      .string(REQUIRED('La identificación'))
      .trim()
      .regex(/^[A-Za-z0-9]{1,20}$/, { error: 'La identificación solo admite letras y números (máximo 20)' }),
    birthDate: z
      .string(REQUIRED('La fecha de nacimiento'))
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'La fecha de nacimiento debe tener el formato AAAA-MM-DD' })
      .refine(isRealCalendarDate, { error: 'La fecha de nacimiento no es válida' })
      .refine((value) => isAdult(value), { error: UNDERAGE_MESSAGE }),
    email: z
      .string(REQUIRED('El correo'))
      .trim()
      .max(254, { error: 'El correo es demasiado largo' })
      .pipe(z.email({ error: 'El correo no es válido' }))
      .transform((value) => value.toLowerCase()),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{7,20}$/, { error: 'El teléfono no es válido' })
      .nullish()
      .transform((value) => value ?? null),
    password: z
      .string(REQUIRED('La contraseña'))
      .min(8, { error: 'La contraseña debe tener al menos 8 caracteres' })
      // bcrypt only reads the first 72 bytes: longer passwords would be silently truncated.
      .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, { error: 'La contraseña es demasiado larga (máximo 72 caracteres)' })
      .refine((value) => /\p{L}/u.test(value) && /\p{N}/u.test(value), {
        error: 'La contraseña debe incluir al menos una letra y un número',
      }),
    preferredCurrencyCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, { error: 'La moneda no es válida' })
      .optional(),
  })
  // Unknown keys (role, id, passwordHash...) are dropped, never stored: no mass assignment.
  .strip()
  .refine((data) => data.password.toLowerCase() !== data.email, {
    path: ['password'],
    error: 'La contraseña no puede ser igual al correo',
  });

export type RegisterBody = z.infer<typeof registerBodySchema>;
