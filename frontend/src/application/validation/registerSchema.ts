import { z } from 'zod';
import { isAdult, UNDERAGE_MESSAGE } from '../../domain/dates';
import { hasLetter, hasNumber, PASSWORD_MAX_BYTES, utf8Length } from '../../domain/passwordRules';

// Same rules and messages as the backend (src/presentation/schemas/authSchemas.ts, registerBodySchema), which is the
// source of truth: if the two ever disagree the API has the last word and its 400 is shown under the field.
const REQUIRED = (field: string) => ({ error: `${field} es obligatorio` });

// "YYYY-MM-DD" that is a real calendar date (rejects 2026-02-30).
function isRealCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function createRegisterSchema(today: Date = new Date()) {
  return z.object({
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
      .refine((value) => isAdult(value, today), { error: UNDERAGE_MESSAGE }),
    // The API stores the email in lowercase and the login looks it up as typed (decision D-4, still open for the
    // login), so it is sent already in lowercase.
    email: z
      .string(REQUIRED('El correo'))
      .trim()
      .max(254, { error: 'El correo es demasiado largo' })
      .pipe(z.email({ error: 'El correo no es válido' }))
      .transform((value) => value.toLowerCase()),
    // Optional: an empty field is "no phone" and is sent as null (the API rejects an empty string).
    phone: z
      .string()
      .trim()
      .transform((value) => (value === '' ? null : value))
      .pipe(z.string().regex(/^\+?[0-9 ()-]{7,20}$/, { error: 'El teléfono no es válido' }).nullable()),
    password: z
      .string(REQUIRED('La contraseña'))
      .min(8, { error: 'La contraseña debe tener al menos 8 caracteres' })
      .refine((value) => utf8Length(value) <= PASSWORD_MAX_BYTES, { error: 'La contraseña es demasiado larga (máximo 72 caracteres)' })
      .refine((value) => hasLetter(value) && hasNumber(value), { error: 'La contraseña debe incluir al menos una letra y un número' }),
  });
}

export interface RegisterFormValues {
  name: string;
  documentId: string;
  birthDate: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export type RegisterField = keyof RegisterFormValues;
export type RegisterErrors = Partial<Record<RegisterField, string>>;

// Body of POST /api/auth/register (the confirmation field never leaves the browser).
export interface RegisterPayload {
  name: string;
  documentId: string;
  birthDate: string;
  email: string;
  phone: string | null;
  password: string;
}

export const REGISTER_FIELDS: readonly RegisterField[] = ['name', 'documentId', 'birthDate', 'email', 'phone', 'password', 'confirmPassword'];

export const CONFIRM_REQUIRED_MESSAGE = 'Confirma tu contraseña';
export const CONFIRM_MISMATCH_MESSAGE = 'Las contraseñas no coinciden';
export const PASSWORD_EQUALS_EMAIL_MESSAGE = 'La contraseña no puede ser igual al correo';

// First error message per field, so each field shows its own message. `data` is only set when everything is valid.
export function validateRegister(
  values: RegisterFormValues,
  today: Date = new Date(),
): { data?: RegisterPayload; errors: RegisterErrors } {
  const result = createRegisterSchema(today).safeParse({
    name: values.name,
    documentId: values.documentId,
    birthDate: values.birthDate,
    email: values.email,
    phone: values.phone,
    password: values.password,
  });

  const errors: RegisterErrors = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as RegisterField | undefined;
      if (field && !errors[field]) errors[field] = issue.message;
    }
  }

  // Cross-field rules are checked here (not in the schema) so they show up even when another field has an error.
  if (!errors.password && values.password.toLowerCase() === values.email.trim().toLowerCase() && values.password !== '') {
    errors.password = PASSWORD_EQUALS_EMAIL_MESSAGE;
  }
  if (values.confirmPassword === '') errors.confirmPassword = CONFIRM_REQUIRED_MESSAGE;
  else if (values.confirmPassword !== values.password) errors.confirmPassword = CONFIRM_MISMATCH_MESSAGE;

  if (!result.success || Object.keys(errors).length > 0) return { errors };
  return { data: result.data, errors: {} };
}
