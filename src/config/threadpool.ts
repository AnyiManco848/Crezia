import { availableParallelism } from 'node:os';

const MIN_SIZE = 4; // libuv default
const MAX_SIZE = 32;

// bcrypt.compare/hash run in libuv's threadpool, which has 4 threads by default, so logins
// cap at a few dozen per second however many cores are free. Sizing it to the CPU count
// raises login throughput without touching the bcrypt cost. An explicit UV_THREADPOOL_SIZE wins.
// It must run before the first threadpool use, so server.ts imports it first.
export function configureThreadpool(env: Record<string, string | undefined> = process.env, cores = availableParallelism()): void {
  if (env.UV_THREADPOOL_SIZE) return;
  env.UV_THREADPOOL_SIZE = String(Math.min(MAX_SIZE, Math.max(MIN_SIZE, cores)));
}
