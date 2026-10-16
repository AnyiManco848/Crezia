import { z } from 'zod';

export const idParamsSchema = z.object({
  id: z.uuid({ error: 'El id no es un UUID válido' }),
});

export type IdParams = z.infer<typeof idParamsSchema>;
