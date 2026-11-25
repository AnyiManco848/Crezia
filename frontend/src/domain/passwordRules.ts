// Password requirements of the registration, the same ones the backend enforces (src/presentation/schemas/authSchemas.ts).
// Kept in one place so the form can show them live and the schema can check them.
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only reads the first 72 BYTES: a longer password would be silently truncated, so the API rejects it.
export const PASSWORD_MAX_BYTES = 72;

export interface PasswordCheck {
  id: 'length' | 'letter' | 'number';
  label: string;
  met: boolean;
}

export function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function hasLetter(value: string): boolean {
  return /\p{L}/u.test(value);
}

export function hasNumber(value: string): boolean {
  return /\p{N}/u.test(value);
}

export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { id: 'length', label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`, met: password.length >= PASSWORD_MIN_LENGTH },
    { id: 'letter', label: 'Una letra', met: hasLetter(password) },
    { id: 'number', label: 'Un número', met: hasNumber(password) },
  ];
}
