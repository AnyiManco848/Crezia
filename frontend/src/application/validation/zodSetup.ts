import { z } from 'zod';

// Zod probes `new Function()` to compile faster validators. Our Content-Security-Policy forbids eval,
// so the probe would be reported as a violation on every load. jitless skips it; validation is the same.
z.config({ jitless: true });
