import { describe, expect, it } from 'vitest';
import { getApiUrl } from './config';

describe('getApiUrl', () => {
  it('uses the variable without trailing slashes', () => {
    expect(getApiUrl('https://api.crezia.test///')).toBe('https://api.crezia.test');
  });

  it('falls back to the local backend when it is not set', () => {
    expect(getApiUrl(undefined)).toBe('http://localhost:3000');
    expect(getApiUrl('  ')).toBe('http://localhost:3000');
  });
});
