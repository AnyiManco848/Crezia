import { describe, expect, it } from 'vitest';
import { getInitials } from './user';

describe('getInitials', () => {
  it('takes the first and last words', () => {
    expect(getInitials('Camila Rodríguez Pérez')).toBe('CP');
    expect(getInitials('Usuario de Prueba')).toBe('UP');
  });

  it('works with one word and extra spaces', () => {
    expect(getInitials('Camila')).toBe('C');
    expect(getInitials('  ana   maría  ')).toBe('AM');
  });

  it('uses a placeholder for an empty name', () => {
    expect(getInitials('   ')).toBe('?');
  });
});
