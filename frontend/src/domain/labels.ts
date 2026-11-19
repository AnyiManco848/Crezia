import type { MovementType, PaymentMethod } from './types';

export const TYPE_LABELS: Record<MovementType, string> = { Income: 'Ingreso', Expense: 'Gasto' };

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  Cash: 'Efectivo',
  Transfer: 'Transferencia',
  CreditCard: 'Tarjeta de crédito',
  DebitCard: 'Tarjeta débito',
  Other: 'Otro',
};

// Active currencies of the catalog (prisma/seed.ts). There is no endpoint to list them, so they are fixed here;
// add a currency here when the seed adds one.
export const CURRENCY_OPTIONS = [
  { code: 'COP', label: 'COP · Peso colombiano' },
  { code: 'USD', label: 'USD · Dólar estadounidense' },
] as const;
