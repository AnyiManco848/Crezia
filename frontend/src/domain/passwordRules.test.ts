import { describe, expect, it } from 'vitest';
import { hasLetter, hasNumber, passwordChecks, utf8Length } from './passwordRules';

describe('passwordChecks', () => {
  it('reports each requirement on its own', () => {
    expect(passwordChecks('').map((check) => check.met)).toEqual([false, false, false]);
    expect(passwordChecks('abcdefgh').map((check) => check.met)).toEqual([true, true, false]);
    expect(passwordChecks('12345678').map((check) => check.met)).toEqual([true, false, true]);
    expect(passwordChecks('Clave123').map((check) => check.met)).toEqual([true, true, true]);
    expect(passwordChecks('a1').map((check) => check.met)).toEqual([false, true, true]);
  });

  it('counts accented letters as letters, like the backend (Unicode letters)', () => {
    expect(hasLetter('ñandú')).toBe(true);
    expect(hasNumber('٣')).toBe(true);
  });

  it('measures bytes, not characters', () => {
    expect(utf8Length('abc')).toBe(3);
    expect(utf8Length('ñ')).toBe(2);
    expect(utf8Length('😀')).toBe(4);
  });
});
