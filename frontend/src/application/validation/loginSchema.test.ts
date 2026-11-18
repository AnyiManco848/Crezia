import { describe, expect, it } from 'vitest';
import { validateLogin } from './loginSchema';

describe('validateLogin', () => {
  it('accepts valid credentials and trims the email', () => {
    expect(validateLogin({ email: '  test@crezia.com ', password: 'Test123*' })).toEqual({
      data: { email: 'test@crezia.com', password: 'Test123*' },
      errors: {},
    });
  });

  it('reports each empty field with the backend message', () => {
    const { data, errors } = validateLogin({ email: '', password: '' });

    expect(data).toBeUndefined();
    expect(errors).toEqual({ email: 'El correo es obligatorio', password: 'La contraseña es obligatoria' });
  });

  it('rejects an email that is not valid', () => {
    expect(validateLogin({ email: 'no-es-correo', password: 'x' }).errors).toEqual({ email: 'El correo no es válido' });
  });

  it('does not trim the password', () => {
    expect(validateLogin({ email: 'a@b.co', password: '  ' }).data?.password).toBe('  ');
  });
});
