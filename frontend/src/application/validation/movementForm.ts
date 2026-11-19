import { amountToInput, parseAmountInput } from '../../domain/amount';
import type { Movement, MovementType, PaymentMethod } from '../../domain/types';

// Raw values of the movement form (everything is text, as typed or selected).
export interface MovementFormValues {
  type: MovementType;
  amount: string;
  date: string;
  categoryId: string;
  bankAccountId: string;
  paymentMethod: PaymentMethod;
  currencyCode: string;
  description: string;
}

export type MovementFormErrors = Partial<Record<keyof MovementFormValues, string>>;

// Body of POST / PATCH /api/movements. The currency is only sent without an account: with an account the
// API takes the account's currency and rejects a different one.
export interface MovementPayload {
  type: MovementType;
  amount: string;
  date: string;
  categoryId: string;
  bankAccountId: string | null;
  paymentMethod: PaymentMethod;
  description: string | null;
  currencyCode?: string;
}

export const DEFAULT_CURRENCY = 'COP';
export const MAX_DESCRIPTION = 255;

export function emptyMovementForm(today: string): MovementFormValues {
  return {
    type: 'Expense',
    amount: '',
    date: today,
    categoryId: '',
    bankAccountId: '',
    paymentMethod: 'Cash',
    currencyCode: DEFAULT_CURRENCY,
    description: '',
  };
}

export function formFromMovement(movement: Movement): MovementFormValues {
  return {
    type: movement.type,
    amount: amountToInput(movement.amount),
    date: movement.date,
    categoryId: movement.categoryId,
    bankAccountId: movement.bankAccountId ?? '',
    paymentMethod: movement.paymentMethod,
    currencyCode: movement.currencyCode,
    description: movement.description ?? '',
  };
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export type MovementFormResult =
  | { ok: true; payload: MovementPayload }
  | { ok: false; errors: MovementFormErrors };

export function validateMovementForm(values: MovementFormValues): MovementFormResult {
  const errors: MovementFormErrors = {};

  const amount = parseAmountInput(values.amount);
  if (!amount.ok) errors.amount = amount.message;

  if (values.date === '') errors.date = 'La fecha es obligatoria';
  else if (!isRealDate(values.date)) errors.date = 'La fecha no es válida';

  if (values.categoryId === '') errors.categoryId = 'Selecciona una categoría';

  const description = values.description.trim();
  if (description.length > MAX_DESCRIPTION) errors.description = `La descripción no puede superar ${MAX_DESCRIPTION} caracteres`;

  if (Object.keys(errors).length > 0 || !amount.ok) return { ok: false, errors };

  const hasAccount = values.bankAccountId !== '';
  return {
    ok: true,
    payload: {
      type: values.type,
      amount: amount.value,
      date: values.date,
      categoryId: values.categoryId,
      bankAccountId: hasAccount ? values.bankAccountId : null,
      paymentMethod: values.paymentMethod,
      description: description === '' ? null : description,
      ...(hasAccount ? {} : { currencyCode: values.currencyCode }),
    },
  };
}

// Server field names -> form fields, to show a 400 next to the right input.
export const FORM_FIELDS: readonly (keyof MovementFormValues)[] = [
  'type',
  'amount',
  'date',
  'categoryId',
  'bankAccountId',
  'paymentMethod',
  'currencyCode',
  'description',
];
