import type { Movement, MovementSource, MovementType, PaymentMethod } from '../entities/Movement';
import type { SoftDeleteData } from './CategoryRepository';

export type { SoftDeleteData };

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

export interface Pagination {
  skip: number;
  take: number;
}

export interface MovementPage {
  data: Movement[];
  // Matching rows before pagination.
  total: number;
}

// Every read ignores soft-deleted movements (but not the ones of a deleted account).
export interface MovementRepository {
  // Ordered by date descending, newest first.
  listByUser(userId: string, filters: MovementFilters, pagination: Pagination): Promise<MovementPage>;
  // Any owner; access rules are applied by the use cases.
  findById(id: string): Promise<Movement | null>;
  create(data: CreateMovementData): Promise<Movement>;
  update(id: string, data: UpdateMovementData): Promise<Movement>;
  softDelete(id: string, data: SoftDeleteData): Promise<void>;
}
