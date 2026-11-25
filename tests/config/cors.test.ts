import { describe, expect, it } from 'vitest';
import { DEFAULT_CORS_ORIGINS, parseCorsOrigins } from '../../src/config/cors';

describe('parseCorsOrigins', () => {
  it('uses the development origins when the variable is not set or blank', () => {
    expect(parseCorsOrigins(undefined)).toEqual([...DEFAULT_CORS_ORIGINS]);
    expect(parseCorsOrigins('')).toEqual([...DEFAULT_CORS_ORIGINS]);
    expect(parseCorsOrigins('   ')).toEqual([...DEFAULT_CORS_ORIGINS]);
  });

  it('reads a comma separated list, trimming spaces and ignoring empty items', () => {
    expect(parseCorsOrigins('https://app.example.com, https://www.example.com,,')).toEqual([
      'https://app.example.com',
      'https://www.example.com',
    ]);
  });

  it('normalises each origin and removes duplicates', () => {
    expect(parseCorsOrigins('https://App.Example.com/, https://app.example.com')).toEqual(['https://app.example.com']);
    expect(parseCorsOrigins('http://localhost:5173')).toEqual(['http://localhost:5173']);
    expect(parseCorsOrigins('https://app.example.com:443')).toEqual(['https://app.example.com']);
  });

  it('rejects wildcards', () => {
    expect(() => parseCorsOrigins('*')).toThrow(/comodines/);
    expect(() => parseCorsOrigins('https://*.vercel.app')).toThrow(/comodines/);
  });

  it('rejects values that are not an http(s) origin', () => {
    expect(() => parseCorsOrigins('app.example.com')).toThrow(/no es una URL/);
    expect(() => parseCorsOrigins('ftp://app.example.com')).toThrow(/http o https/);
    expect(() => parseCorsOrigins('https://app.example.com/panel')).toThrow(/sin ruta/);
    expect(() => parseCorsOrigins('https://app.example.com?x=1')).toThrow(/sin ruta/);
  });

  it('rejects a list with no usable origin', () => {
    expect(() => parseCorsOrigins(',')).toThrow(/ningún origen/);
  });
});
