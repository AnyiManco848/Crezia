import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';
import { BcryptPasswordHasher } from '../../src/infrastructure/security/BcryptPasswordHasher';

// 4 rounds keeps the test fast; the default cost (10) is checked through the hash prefix.
describe('BcryptPasswordHasher', () => {
  it('produces a bcrypt hash that is not the plain password', async () => {
    const hash = await new BcryptPasswordHasher(4).hash('Clave-Segura-1');

    expect(hash).not.toContain('Clave-Segura-1');
    expect(hash).toMatch(/^\$2[aby]\$04\$/);
  });

  it('salts every hash: the same password never gives the same hash twice', async () => {
    const hasher = new BcryptPasswordHasher(4);

    expect(await hasher.hash('Clave-Segura-1')).not.toBe(await hasher.hash('Clave-Segura-1'));
  });

  it('accepts the right password and refuses a wrong one', async () => {
    const hasher = new BcryptPasswordHasher(4);
    const hash = await hasher.hash('Clave-Segura-1');

    expect(await hasher.compare('Clave-Segura-1', hash)).toBe(true);
    expect(await hasher.compare('clave-segura-1', hash)).toBe(false);
    expect(await hasher.compare('', hash)).toBe(false);
  });

  it('uses cost 10 by default, so the login dummy hash costs the same as the real ones', async () => {
    const hash = await new BcryptPasswordHasher().hash('x');

    expect(bcrypt.getRounds(hash)).toBe(10);
  });
});
