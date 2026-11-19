import { describe, expect, it } from 'vitest';
import { registerBodySchema } from '../../../src/presentation/schemas/authSchemas';

const VALID = {
  name: 'Camila Rodríguez',
  documentId: '1000000002',
  birthDate: '1995-03-10',
  email: 'Camila@Crezia.com',
  password: 'Clave1234',
};

const issues = (input: unknown) => {
  const result = registerBodySchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('registerBodySchema', () => {
  it('accepts a valid body, lowercases the email and defaults the phone to null', () => {
    const result = registerBodySchema.parse(VALID);

    expect(result.email).toBe('camila@crezia.com');
    expect(result.phone).toBeNull();
    expect(result.preferredCurrencyCode).toBeUndefined();
  });

  it('drops unknown keys such as role, id and passwordHash (no mass assignment)', () => {
    const result = registerBodySchema.parse({ ...VALID, role: 'Admin', id: 'x', passwordHash: 'y', deletedAt: 'z' });

    expect(Object.keys(result).sort()).toEqual(['birthDate', 'documentId', 'email', 'name', 'password', 'phone']);
  });

  it('reports every missing field with a Spanish message', () => {
    const found = issues({});

    for (const field of ['name', 'documentId', 'birthDate', 'email', 'password']) {
      expect(found.some((message) => message.startsWith(`${field}: `) && message.includes('obligatorio'))).toBe(true);
    }
  });

  it.each([
    ['too short', 'Ab1'],
    ['no number', 'SoloLetras'],
    ['no letter', '12345678'],
  ])('rejects a password that is %s', (_label, password) => {
    expect(issues({ ...VALID, password }).some((message) => message.startsWith('password:'))).toBe(true);
  });

  it('accepts accented letters and counts bytes, not characters, for the 72 limit', () => {
    const tooLong = ['password: La contraseña es demasiado larga (máximo 72 caracteres)'];

    expect(issues({ ...VALID, password: 'Contraseña1' })).toEqual([]);
    expect(issues({ ...VALID, password: `${'a'.repeat(71)}1` })).toEqual([]);
    expect(issues({ ...VALID, password: `${'a'.repeat(72)}1` })).toEqual(tooLong);
    expect(issues({ ...VALID, password: `${'ñ'.repeat(40)}1` })).toEqual(tooLong);
  });

  it('rejects a password equal to the email', () => {
    const body = { ...VALID, email: 'clave1234@crezia.com', password: 'Clave1234@crezia.com' };

    expect(issues(body)).toEqual(['password: La contraseña no puede ser igual al correo']);
  });

  it('rejects an invalid email, a malformed date, an impossible date and a minor', () => {
    expect(issues({ ...VALID, email: 'no-es-correo' })).toEqual(['email: El correo no es válido']);
    expect(issues({ ...VALID, birthDate: '10/03/1995' })[0]).toMatch(/formato AAAA-MM-DD/);
    expect(issues({ ...VALID, birthDate: '1995-02-30' })).toEqual(['birthDate: La fecha de nacimiento no es válida']);
    expect(issues({ ...VALID, birthDate: '2999-01-01' })).toEqual(['birthDate: Debes tener 18 años o más']);
  });

  it('validates the documentId, phone and currency formats', () => {
    expect(issues({ ...VALID, documentId: '12 34' })[0]).toMatch(/^documentId:/);
    expect(issues({ ...VALID, phone: 'abc' })).toEqual(['phone: El teléfono no es válido']);
    expect(registerBodySchema.parse({ ...VALID, phone: '+57 300 123 4567' }).phone).toBe('+57 300 123 4567');
    expect(registerBodySchema.parse({ ...VALID, phone: null }).phone).toBeNull();
    expect(registerBodySchema.parse({ ...VALID, preferredCurrencyCode: 'usd' }).preferredCurrencyCode).toBe('USD');
    expect(issues({ ...VALID, preferredCurrencyCode: 'PESOS' })).toEqual(['preferredCurrencyCode: La moneda no es válida']);
  });
});
