import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { DEFAULT_REGISTER_RATE_LIMIT, type RegisterRateLimitConfig } from '../../config/security';
import { TooManyRequestsError } from '../../domain/errors';

// Limits the attempts per client IP. EVERY attempt counts (valid, invalid or repeated email), because the
// goal is to stop mass registration, enumeration and abuse of bcrypt's CPU cost. Counters live in memory:
// they reset when the server restarts and are not shared between instances (accepted for now).
// Over the limit it answers 429 through the common error handler, with a Retry-After header in seconds.
export function createRegisterRateLimiter(config: RegisterRateLimitConfig = DEFAULT_REGISTER_RATE_LIMIT): RequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    limit: config.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      const info = (req as unknown as Record<string, { resetTime?: Date } | undefined>)[options.requestPropertyName];
      const resetTime = info?.resetTime;
      const seconds = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(options.windowMs / 1000);
      res.set('Retry-After', String(seconds));
      next(new TooManyRequestsError());
    },
  });
}
