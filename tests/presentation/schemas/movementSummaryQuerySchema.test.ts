import { describe, expect, it } from 'vitest';
import {
  INVALID_PERIOD_MESSAGE,
  PERIOD_TOO_LONG_MESSAGE,
} from '../../../src/application/movements/GetMovementSummaryUseCase';
import { movementSummaryQuerySchema } from '../../../src/presentation/schemas/movementSchemas';

const messages = (query: unknown) =>
  movementSummaryQuerySchema.safeParse(query).error?.issues.map((issue) => issue.message);

describe('movementSummaryQuerySchema', () => {
  const valid = { from: '2026-11-01', to: '2026-11-30' };

  it('defaults the currency to COP', () => {
    expect(movementSummaryQuerySchema.parse(valid)).toEqual({ ...valid, currencyCode: 'COP' });
  });

  it('upper-cases the currency', () => {
    expect(movementSummaryQuerySchema.parse({ ...valid, currencyCode: 'usd' }).currencyCode).toBe('USD');
  });

  it('strips unknown keys such as userId, so the owner can never come from the query', () => {
    const result = movementSummaryQuerySchema.parse({ ...valid, userId: 'someone-else', page: '2' });

    expect(result).toEqual({ ...valid, currencyCode: 'COP' });
  });

  it('requires both dates', () => {
    expect(movementSummaryQuerySchema.safeParse({ to: valid.to }).success).toBe(false);
    expect(movementSummaryQuerySchema.safeParse({ from: valid.from }).success).toBe(false);
    expect(movementSummaryQuerySchema.safeParse({}).success).toBe(false);
  });

  it.each(['2026-02-30', '01/11/2026', 'hoy', ''])('rejects the malformed date %j', (from) => {
    expect(messages({ ...valid, from })).toContain('La fecha debe tener el formato AAAA-MM-DD');
  });

  it('rejects a "from" later than "to"', () => {
    expect(messages({ from: '2026-11-30', to: '2026-11-01' })).toEqual([INVALID_PERIOD_MESSAGE]);
  });

  it('accepts 366 days and rejects 367', () => {
    expect(movementSummaryQuerySchema.safeParse({ from: '2028-01-01', to: '2028-12-31' }).success).toBe(true);
    expect(messages({ from: '2028-01-01', to: '2029-01-01' })).toEqual([PERIOD_TOO_LONG_MESSAGE]);
  });

  it.each(['CO', 'COPP', 'C0P', '123'])('rejects the invalid currency %j', (currencyCode) => {
    expect(messages({ ...valid, currencyCode })).toContain(
      'La moneda debe ser un código de 3 letras (por ejemplo COP)',
    );
  });
});
