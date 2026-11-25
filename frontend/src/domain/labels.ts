import type { AccountType, GoalReason, GoalStatus, MovementType, PaymentMethod } from './types';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  Savings: 'Ahorros',
  Checking: 'Corriente',
  Credit: 'Crédito',
  Other: 'Otra',
};

export const TYPE_LABELS: Record<MovementType, string> = { Income: 'Ingreso', Expense: 'Gasto' };

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  Cash: 'Efectivo',
  Transfer: 'Transferencia',
  CreditCard: 'Tarjeta de crédito',
  DebitCard: 'Tarjeta débito',
  Other: 'Otro',
};

export const GOAL_REASON_LABELS: Record<GoalReason, string> = {
  Travel: 'Viaje',
  Vehicle: 'Vehículo',
  Education: 'Educación',
  EmergencyFund: 'Fondo de emergencia',
  HomePurchase: 'Compra de vivienda',
  Technology: 'Tecnología',
  DebtPayment: 'Pago de deudas',
  Other: 'Otro',
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  Active: 'Activa',
  Completed: 'Completada',
  Cancelled: 'Cancelada',
  Overdue: 'Vencida',
};

// Active currencies of the catalog (prisma/seed.ts). There is no endpoint to list them, so they are fixed here;
// add a currency here when the seed adds one.
export const CURRENCY_OPTIONS = [
  { code: 'COP', label: 'COP · Peso colombiano' },
  { code: 'USD', label: 'USD · Dólar estadounidense' },
] as const;
