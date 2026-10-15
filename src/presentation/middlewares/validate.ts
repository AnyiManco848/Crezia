import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ValidationError, type ErrorDetail } from '../../domain/errors';

export interface RequestSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

// Validates and replaces body, params and query with the parsed (typed, trimmed) values.
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const details: ErrorDetail[] = [];
    const parsed: Partial<Record<keyof RequestSchemas, unknown>> = {};

    for (const part of ['body', 'params', 'query'] as const) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        parsed[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ path: [part, ...issue.path].join('.'), message: issue.message });
        }
      }
    }

    if (details.length > 0) return next(new ValidationError(undefined, details));

    if ('body' in parsed) req.body = parsed.body;
    if ('params' in parsed) req.params = parsed.params as typeof req.params;
    // Express 5 exposes req.query as a getter, so it has to be redefined.
    if ('query' in parsed) Object.defineProperty(req, 'query', { value: parsed.query });
    next();
  };
}
