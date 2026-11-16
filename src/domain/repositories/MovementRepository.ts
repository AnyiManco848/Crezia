import type { Movement, MovementSource, MovementType, PaymentMethod } from '../entities/Movement';
import type { Page, Pagination } from '../pagination';
import type { SoftDeleteData } from './CategoryRepository';

export type { Pagination, SoftDeleteData };

export interface CreateMovementData {
  userId: string;
  bankAccountId: string | null;
  categoryId: string;
  type: MovementType;
  amount: string;
  currencyCode: string;
  date: string;
  paymentMethod: PaymentMethod;
  source: MovementSource;
  description: string | null;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateMovementData {
  bankAccountId?: string | null;
  categoryId?: string;
  type?: MovementType;
  amount?: string;
  currencyCode?: string;
  date?: string;
  paymentMethod?: PaymentMethod;
  description?: string | null;
  updatedBy: string;
}

// Every filter is optional; from and to are inclusive "YYYY-MM-DD" dates.
export interface MovementFilters {
  type?: MovementType;
  categoryId?: string;
  bankAccountId?: string;
  from?: string;
  to?: string;
}

export type MovementPage = Page<Movement>;

// from and to are inclusive "YYYY-MM-DD" dates; every total is of a single currency.
export interface MovementSummaryFilter {
  from: string;
  to: string;
  currencyCode: string;
}

// Sum and count of the movements of one type inside the period.
export interface MovementTypeTotal {
  type: MovementType;
  // Decimal string with up to two places, as NUMERIC(14,2) arrives from the database.
  amount: string;
  count: number;
}

// Every read ignores soft-deleted movements (but not the ones of a deleted account).
export interface MovementRepository {
  // Ordered by date descending, newest first.
  listByUser(userId: string, filters: MovementFilters, pagination: Pagination): Promise<MovementPage>;
  // Totals by type for the whole period (no pagination): only the owner's movements, in the given currency.
  // Returns at most one entry per type; a type without movements is omitted.
  sumByTypeInPeriod(userId: string, filter: MovementSummaryFilter): Promise<MovementTypeTotal[]>;
  // Any owner; access rules are applied by the use cases.
  findById(id: string): Promise<Movement | null>;
  create(data: CreateMovementData): Promise<Movement>;
  update(id: string, data: UpdateMovementData): Promise<Movement>;
  softDelete(id: string, data: SoftDeleteData): Promise<void>;
}
