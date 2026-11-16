import { describe, expect, it } from 'vitest';
import { configureThreadpool } from '../../src/config/threadpool';

describe('configureThreadpool', () => {
  it('sizes the threadpool to the CPU count', () => {
    const env: Record<string, string | undefined> = {};
    configureThreadpool(env, 12);
    expect(env.UV_THREADPOOL_SIZE).toBe('12');
  });

  it('never goes below the libuv default of 4 nor above 32', () => {
    const low: Record<string, string | undefined> = {};
    const high: Record<string, string | undefined> = {};
    configureThreadpool(low, 2);
    configureThreadpool(high, 128);
    expect(low.UV_THREADPOOL_SIZE).toBe('4');
    expect(high.UV_THREADPOOL_SIZE).toBe('32');
  });

  it('keeps an explicit UV_THREADPOOL_SIZE', () => {
    const env: Record<string, string | undefined> = { UV_THREADPOOL_SIZE: '6' };
    configureThreadpool(env, 12);
    expect(env.UV_THREADPOOL_SIZE).toBe('6');
  });
});
