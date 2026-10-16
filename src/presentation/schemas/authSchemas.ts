import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.string({ error: 'El correo es obligatorio' }).trim().pipe(z.email({ error: 'El correo no es válido' })),
  password: z.string({ error: 'La contraseña es obligatoria' }).min(1, { error: 'La contraseña es obligatoria' }),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
