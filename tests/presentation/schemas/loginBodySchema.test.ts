import { describe, expect, it } from 'vitest';
import { loginBodySchema } from '../../../src/presentation/schemas/authSchemas';

describe('loginBodySchema', () => {
  it('trims and lowercases the email, like the registration (D-4)', () => {
    const parsed = loginBodySchema.parse({ email: '  Test@CREZIA.com ', password: 'Test123*' });

    expect(parsed.email).toBe('test@crezia.com');
  });

  it('does not touch the password', () => {
    const parsed = loginBodySchema.parse({ email: 'a@crezia.com', password: '  MiClave  ' });

    expect(parsed.password).toBe('  MiClave  ');
  });

  it('still rejects an invalid or missing email with Spanish messages', () => {
    expect(loginBodySchema.safeParse({ email: 'no-es-correo', password: 'x' }).error?.issues[0]?.message).toBe('El correo no es válido');
    expect(loginBodySchema.safeParse({ password: 'x' }).error?.issues[0]?.message).toBe('El correo es obligatorio');
  });
});
