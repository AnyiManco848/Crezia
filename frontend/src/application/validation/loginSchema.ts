import { z } from 'zod';

// Same rules and messages as the backend (src/presentation/schemas/authSchemas.ts).
export const loginSchema = z.object({
  email: z
    .string({ error: 'El correo es obligatorio' })
    .trim()
    .min(1, { error: 'El correo es obligatorio' })
    .pipe(z.email({ error: 'El correo no es válido' })),
  password: z.string({ error: 'La contraseña es obligatoria' }).min(1, { error: 'La contraseña es obligatoria' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginField = keyof LoginInput;

// First error message per field, so each field can show its own message.
export function validateLogin(values: { email: string; password: string }): {
  data?: LoginInput;
  errors: Partial<Record<LoginField, string>>;
} {
  const result = loginSchema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} };

  const errors: Partial<Record<LoginField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as LoginField | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { errors };
}
