import { amountToInput, parseAmountInput } from '../../domain/amount';
import { isRealIsoDate } from '../../domain/dates';
import { GOAL_REASONS, GOAL_STATUSES, type Goal, type GoalReason, type GoalStatus } from '../../domain/types';

export interface GoalFormValues {
  name: string;
  categoryId: string;
  reason: GoalReason;
  reasonOther: string;
  targetAmount: string;
  currencyCode: string;
  startDate: string;
  endDate: string;
  status: GoalStatus;
}

export type GoalFormErrors = Partial<Record<keyof GoalFormValues, string>>;

// Body of POST / PATCH /api/goals. `status` is only sent on edit: a new goal always starts Active.
export interface GoalPayload {
  categoryId: string;
  name: string;
  reason: GoalReason;
  reasonOther: string | null;
  targetAmount: string;
  currencyCode: string;
  startDate: string;
  endDate: string;
  status?: GoalStatus;
}

// Limits and messages copied from the backend (src/presentation/schemas/goalSchemas.ts and
// src/application/goals/goalAccess.ts), so the person sees the same text before and after sending.
export const MAX_GOAL_NAME = 100;
export const MAX_REASON_OTHER = 255;
export const DEFAULT_GOAL_CURRENCY = 'COP';
export const COP_NO_DECIMALS_MESSAGE = 'En pesos colombianos el monto va sin decimales (por ejemplo 15000000)';
export const END_DATE_NOT_AFTER_MESSAGE = 'La fecha fin debe ser posterior a la fecha inicio';
export const END_DATE_IN_PAST_MESSAGE = 'La fecha fin no puede estar en el pasado';
export const REASON_OTHER_REQUIRED_MESSAGE = 'Describe el motivo cuando eliges «Otro»';

export function emptyGoalForm(today: string): GoalFormValues {
  return {
    name: '',
    categoryId: '',
    reason: 'Travel',
    reasonOther: '',
    targetAmount: '',
    currencyCode: DEFAULT_GOAL_CURRENCY,
    startDate: today,
    endDate: '',
    status: 'Active',
  };
}

export function formFromGoal(goal: Goal): GoalFormValues {
  return {
    name: goal.name,
    categoryId: goal.categoryId,
    reason: goal.reason,
    reasonOther: goal.reasonOther ?? '',
    targetAmount: amountToInput(goal.targetAmount),
    currencyCode: goal.currencyCode,
    startDate: goal.startDate,
    endDate: goal.endDate,
    status: goal.status,
  };
}

export type GoalFormResult = { ok: true; payload: GoalPayload } | { ok: false; errors: GoalFormErrors };

// `original` is null when creating. Only a NEW goal needs an end date that is not in the past: the backend lets an
// old goal be edited (for example to mark it Completed) even when its end date has already passed.
export function validateGoalForm(values: GoalFormValues, original: Goal | null, today: string): GoalFormResult {
  const errors: GoalFormErrors = {};
  const name = values.name.trim();
  const reasonOther = values.reasonOther.trim();

  if (name === '') errors.name = 'El nombre es obligatorio';
  else if (name.length > MAX_GOAL_NAME) errors.name = `El nombre no puede superar los ${MAX_GOAL_NAME} caracteres`;

  if (values.categoryId === '') errors.categoryId = 'Selecciona una categoría';
  if (!GOAL_REASONS.includes(values.reason)) errors.reason = 'Selecciona un motivo';

  if (values.reason === 'Other') {
    if (reasonOther === '') errors.reasonOther = REASON_OTHER_REQUIRED_MESSAGE;
    else if (reasonOther.length > MAX_REASON_OTHER) errors.reasonOther = `El motivo no puede superar los ${MAX_REASON_OTHER} caracteres`;
  }

  if (!/^[A-Z]{3}$/.test(values.currencyCode)) errors.currencyCode = 'Selecciona una moneda';

  const amount = parseAmountInput(values.targetAmount);
  if (!amount.ok) errors.targetAmount = amount.message;
  else if (values.currencyCode === 'COP' && amount.value.includes('.')) errors.targetAmount = COP_NO_DECIMALS_MESSAGE;

  if (values.startDate === '') errors.startDate = 'La fecha inicio es obligatoria';
  else if (!isRealIsoDate(values.startDate)) errors.startDate = 'La fecha inicio no es válida';

  if (values.endDate === '') errors.endDate = 'La fecha fin es obligatoria';
  else if (!isRealIsoDate(values.endDate)) errors.endDate = 'La fecha fin no es válida';
  else if (!errors.startDate && values.endDate <= values.startDate) errors.endDate = END_DATE_NOT_AFTER_MESSAGE;
  else if (original === null && values.endDate < today) errors.endDate = END_DATE_IN_PAST_MESSAGE;

  if (!GOAL_STATUSES.includes(values.status)) errors.status = 'Selecciona un estado';

  if (Object.keys(errors).length > 0 || !amount.ok) return { ok: false, errors };

  return {
    ok: true,
    payload: {
      categoryId: values.categoryId,
      name,
      reason: values.reason,
      // The backend rejects a description with any reason other than "Other".
      reasonOther: values.reason === 'Other' ? reasonOther : null,
      targetAmount: amount.value,
      currencyCode: values.currencyCode,
      startDate: values.startDate,
      endDate: values.endDate,
      ...(original ? { status: values.status } : {}),
    },
  };
}

// Server field names -> form fields, to show a 400 or a 409 next to the right input.
export const GOAL_FORM_FIELDS: readonly (keyof GoalFormValues)[] = [
  'name',
  'categoryId',
  'reason',
  'reasonOther',
  'targetAmount',
  'currencyCode',
  'startDate',
  'endDate',
  'status',
];
