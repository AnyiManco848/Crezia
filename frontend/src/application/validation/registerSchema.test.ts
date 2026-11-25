import { describe, expect, it } from 'vitest';
import { validateRegister, type RegisterFormValues } from './registerSchema';

const TODAY = new Date(2026, 10, 22);

const valid = (overrides: Partial<RegisterFormValues> = {}): RegisterFormValues => ({
  name: 'Camila Rodríguez',
  documentId: '1000000001',
  birthDate: '1995-03-10',
  email: 'camila@crezia.com',
  phone: '',
  password: 'Clave1234',
  confirmPassword: 'Clave1234',
  ...overrides,
});

const errorsOf = (overrides: Partial<RegisterFormValues>) => validateRegister(valid(overrides), TODAY).errors;
const withPassword = (password: string, extra: Partial<RegisterFormValues> = {}) => errorsOf({ password, confirmPassword: password, ...extra });

describe('validateRegister', () => {
  it('builds the payload without the confirmation, with an empty phone as null and the email in lowercase', () => {
    const result = validateRegister(valid({ name: '  Camila Rodríguez ', email: '  Camila@CREZIA.com ', documentId: ' 100abc ' }), TODAY);

    expect(result.errors).toEqual({});
    expect(result.data).toEqual({
      name: 'Camila Rodríguez',
      documentId: '100abc',
      birthDate: '1995-03-10',
      email: 'camila@crezia.com',
      phone: null,
      password: 'Clave1234',
    });
    expect(result.data).not.toHaveProperty('confirmPassword');
  });

  it('requires every field except the phone, each with its own message', () => {
    const result = validateRegister({ name: '', documentId: '', birthDate: '', email: '', phone: '', password: '', confirmPassword: '' }, TODAY);

    expect(result.data).toBeUndefined();
    expect(result.errors).toEqual({
      name: 'El nombre debe tener al menos 2 caracteres',
      documentId: 'La identificación solo admite letras y números (máximo 20)',
      birthDate: 'La fecha de nacimiento debe tener el formato AAAA-MM-DD',
      email: 'El correo no es válido',
      password: 'La contraseña debe tener al menos 8 caracteres',
      confirmPassword: 'Confirma tu contraseña',
    });
  });

  it('limits the name to 2 to 120 characters', () => {
    expect(errorsOf({ name: 'A' }).name).toBe('El nombre debe tener al menos 2 caracteres');
    expect(errorsOf({ name: 'A'.repeat(121) }).name).toBe('El nombre no puede superar 120 caracteres');
    expect(errorsOf({ name: 'A'.repeat(120) }).name).toBeUndefined();
  });

  it('accepts letters and digits only in the identification, up to 20', () => {
    expect(errorsOf({ documentId: '123-456' }).documentId).toBe('La identificación solo admite letras y números (máximo 20)');
    expect(errorsOf({ documentId: '1'.repeat(21) }).documentId).toBeDefined();
    expect(errorsOf({ documentId: '1'.repeat(20) }).documentId).toBeUndefined();
    expect(errorsOf({ documentId: 'AB123' }).documentId).toBeUndefined();
  });

  it('requires 18 years completed today and a real date', () => {
    expect(errorsOf({ birthDate: '2008-11-23' }).birthDate).toBe('Debes tener 18 años o más');
    expect(errorsOf({ birthDate: '2008-11-22' }).birthDate).toBeUndefined();
    expect(errorsOf({ birthDate: '2030-01-01' }).birthDate).toBe('Debes tener 18 años o más');
    expect(errorsOf({ birthDate: '1995-02-30' }).birthDate).toBe('La fecha de nacimiento no es válida');
  });

  it('checks the email format and length', () => {
    expect(errorsOf({ email: 'camila' }).email).toBe('El correo no es válido');
    expect(errorsOf({ email: 'a@b' }).email).toBe('El correo no es válido');
    expect(errorsOf({ email: `${'a'.repeat(250)}@x.co` }).email).toBe('El correo es demasiado largo');
  });

  it('accepts an optional phone with digits, spaces, + ( ) and -, from 7 to 20 characters', () => {
    expect(errorsOf({ phone: '+57 (300) 123-4567' }).phone).toBeUndefined();
    expect(errorsOf({ phone: '3001234567' }).phone).toBeUndefined();
    expect(errorsOf({ phone: '123456' }).phone).toBe('El teléfono no es válido');
    expect(errorsOf({ phone: 'abc1234567' }).phone).toBe('El teléfono no es válido');
    expect(errorsOf({ phone: '1'.repeat(21) }).phone).toBe('El teléfono no es válido');
    expect(validateRegister(valid({ phone: ' 3001234567 ' }), TODAY).data?.phone).toBe('3001234567');
  });

  it('applies the password rules of the backend', () => {
    expect(withPassword('Ab1').password).toBe('La contraseña debe tener al menos 8 caracteres');
    expect(withPassword('abcdefgh').password).toBe('La contraseña debe incluir al menos una letra y un número');
    expect(withPassword('12345678').password).toBe('La contraseña debe incluir al menos una letra y un número');
    expect(withPassword(`${'a1'.repeat(36)}b`).password).toBe('La contraseña es demasiado larga (máximo 72 caracteres)');
  });

  it('counts the 72-byte limit in bytes, not in characters', () => {
    // 35 two-byte letters + "12" = 72 bytes (allowed); 36 + "12" = 74 bytes (too long), though both are under 72 characters
    expect(withPassword(`${'ñ'.repeat(35)}12`).password).toBeUndefined();
    expect(withPassword(`${'ñ'.repeat(36)}12`).password).toBe('La contraseña es demasiado larga (máximo 72 caracteres)');
  });

  it('rejects a password equal to the email, whatever the case', () => {
    expect(withPassword('CAMILA1234@X.CO', { email: 'camila1234@x.co' }).password).toBe('La contraseña no puede ser igual al correo');
  });

  it('asks for the confirmation and compares it exactly', () => {
    expect(errorsOf({ confirmPassword: '' }).confirmPassword).toBe('Confirma tu contraseña');
    expect(errorsOf({ confirmPassword: 'clave1234' }).confirmPassword).toBe('Las contraseñas no coinciden');
    expect(errorsOf({ confirmPassword: 'Clave1234' }).confirmPassword).toBeUndefined();
  });

  it('reports the mismatch even when another field has an error', () => {
    const errors = errorsOf({ name: '', confirmPassword: 'otra' });
    expect(errors.name).toBeDefined();
    expect(errors.confirmPassword).toBe('Las contraseñas no coinciden');
  });
});
