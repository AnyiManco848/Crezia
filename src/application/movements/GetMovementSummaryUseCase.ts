import { ValidationError } from '../../domain/errors';
import type { MovementRepository } from '../../domain/repositories/MovementRepository';
import { fromCents, toCents } from '../money';

export const DEFAULT_SUMMARY_CURRENCY = 'COP';
export const MAX_PERIOD_DAYS = 366;
export const INVALID_PERIOD_MESSAGE = 'La fecha "from" no puede ser posterior a "to"';
export const PERIOD_TOO_LONG_MESSAGE = `El periodo no puede superar los ${MAX_PERIOD_DAYS} días`;

export interface GetMovementSummaryInput {
  // Inclusive "YYYY-MM-DD" dates.
  from: string;
  to: string;
  currencyCode?: string;
}

export interface MovementSummary {
  from: string;
  to: string;
  currencyCode: string;
  // Decimal strings with two places (e.g. "7000000.00"); balance is negative when expenses win.
  totalIncome: string;
  totalExpense: string;
  balance: string;
  movementCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Number of calendar days from `from` to `to`, both included (a single day is 1).
export function periodDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}

// Totals of the whole period for the owner, never of a single page of the list.
export class GetMovementSummaryUseCase {
  constructor(private readonly movements: MovementRepository) {}

  // The schema already checks the period; it is repeated so the use case is safe on its own.
  async execute(
    { from, to, currencyCode = DEFAULT_SUMMARY_CURRENCY }: GetMovementSummaryInput,
    userId: string,
  ): Promise<MovementSummary> {
    if (from > to) throw new ValidationError(INVALID_PERIOD_MESSAGE);
    if (periodDays(from, to) > MAX_PERIOD_DAYS) throw new ValidationError(PERIOD_TOO_LONG_MESSAGE);

    const totals = await this.movements.sumByTypeInPeriod(userId, { from, to, currencyCode });

    // Integer cents avoid floating point errors (0.1 + 0.2).
    let income = 0;
    let expense = 0;
    let movementCount = 0;
    for (const total of totals) {
      if (total.type === 'Income') income += toCents(total.amount);
      else expense += toCents(total.amount);
      movementCount += total.count;
    }

    return {
      from,
      to,
      currencyCode,
      totalIncome: fromCents(income),
      totalExpense: fromCents(expense),
      balance: fromCents(income - expense),
      movementCount,
    };
  }
}
