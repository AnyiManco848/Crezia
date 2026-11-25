import { describe, expect, it } from 'vitest';
import type { Goal } from '../../domain/types';
import { emptyGoalForm, formFromGoal, validateGoalForm, type GoalFormValues } from './goalForm';

const TODAY = '2026-11-22';

const valid = (overrides: Partial<GoalFormValues> = {}): GoalFormValues => ({
  ...emptyGoalForm(TODAY),
  name: 'Viaje a Japón',
  categoryId: 'c1',
  targetAmount: '15000000',
  endDate: '2027-12-31',
  ...overrides,
});

const goal: Goal = {
  id: 'g1',
  categoryId: 'c1',
  name: 'Viaje',
  reason: 'Other',
  reasonOther: 'Aventura',
  targetAmount: '15000000.00',
  currencyCode: 'COP',
  startDate: '2026-01-01',
  endDate: '2026-06-30',
  status: 'Active',
  accumulated: '0.00',
  remaining: '15000000.00',
  percentage: 0,
};

const errorsOf = (values: GoalFormValues, original: Goal | null = null) => {
  const result = validateGoalForm(values, original, TODAY);
  return result.ok ? {} : result.errors;
};

describe('validateGoalForm', () => {
  it('starts a new form with today as the start date, COP and no end date', () => {
    expect(emptyGoalForm(TODAY)).toMatchObject({ startDate: TODAY, endDate: '', currencyCode: 'COP', reason: 'Travel', status: 'Active' });
  });

  it('builds the payload of a new goal without status', () => {
    expect(validateGoalForm(valid({ name: '  Viaje a Japón ' }), null, TODAY)).toEqual({
      ok: true,
      payload: {
        categoryId: 'c1',
        name: 'Viaje a Japón',
        reason: 'Travel',
        reasonOther: null,
        targetAmount: '15000000',
        currencyCode: 'COP',
        startDate: TODAY,
        endDate: '2027-12-31',
      },
    });
  });

  it('sends the status only when editing', () => {
    const result = validateGoalForm(valid({ status: 'Completed' }), goal, TODAY);
    expect(result.ok && result.payload.status).toBe('Completed');
  });

  it('requires name, category, target and end date', () => {
    expect(errorsOf(emptyGoalForm(TODAY))).toEqual({
      name: 'El nombre es obligatorio',
      categoryId: 'Selecciona una categoría',
      targetAmount: 'El monto es obligatorio',
      endDate: 'La fecha fin es obligatoria',
    });
  });

  it('limits the name to 100 characters', () => {
    expect(errorsOf(valid({ name: 'a'.repeat(101) })).name).toBe('El nombre no puede superar los 100 caracteres');
    expect(errorsOf(valid({ name: 'a'.repeat(100) })).name).toBeUndefined();
  });

  it('requires the reason description with "Other" and drops it with any other reason', () => {
    expect(errorsOf(valid({ reason: 'Other' })).reasonOther).toBe('Describe el motivo cuando eliges «Otro»');
    expect(errorsOf(valid({ reason: 'Other', reasonOther: 'x'.repeat(256) })).reasonOther).toBe('El motivo no puede superar los 255 caracteres');

    const other = validateGoalForm(valid({ reason: 'Other', reasonOther: ' Aventura ' }), null, TODAY);
    expect(other.ok && other.payload.reasonOther).toBe('Aventura');
    const travel = validateGoalForm(valid({ reason: 'Travel', reasonOther: 'se ignora' }), null, TODAY);
    expect(travel.ok && travel.payload.reasonOther).toBeNull();
  });

  it('rejects a target of zero or an ambiguous one', () => {
    expect(errorsOf(valid({ targetAmount: '0' })).targetAmount).toBe('El monto debe ser mayor a 0');
    expect(errorsOf(valid({ targetAmount: '15.000' })).targetAmount).toContain('separador de miles');
  });

  it('does not accept decimals in COP but accepts two in USD', () => {
    expect(errorsOf(valid({ targetAmount: '1500000,50' })).targetAmount).toBe('En pesos colombianos el monto va sin decimales (por ejemplo 15000000)');
    const usd = validateGoalForm(valid({ currencyCode: 'USD', targetAmount: '1500,50' }), null, TODAY);
    expect(usd.ok && usd.payload.targetAmount).toBe('1500.50');
  });

  it('requires the end date to be after the start date', () => {
    expect(errorsOf(valid({ startDate: '2027-01-01', endDate: '2027-01-01' })).endDate).toBe('La fecha fin debe ser posterior a la fecha inicio');
    expect(errorsOf(valid({ startDate: '2027-01-02', endDate: '2027-01-01' })).endDate).toBe('La fecha fin debe ser posterior a la fecha inicio');
    expect(errorsOf(valid({ startDate: '2027-01-01', endDate: '2027-01-02' })).endDate).toBeUndefined();
  });

  it('rejects impossible dates', () => {
    const errors = errorsOf(valid({ startDate: '2026-02-30', endDate: '2027-13-01' }));
    expect(errors.startDate).toBe('La fecha inicio no es válida');
    expect(errors.endDate).toBe('La fecha fin no es válida');
  });

  it('rejects a past end date on a new goal but not when editing an old one', () => {
    const values = valid({ startDate: '2026-01-01', endDate: '2026-06-30' });
    expect(errorsOf(values).endDate).toBe('La fecha fin no puede estar en el pasado');
    expect(errorsOf(values, goal).endDate).toBeUndefined();
    // today itself is allowed
    expect(errorsOf(valid({ startDate: '2026-11-01', endDate: TODAY })).endDate).toBeUndefined();
  });

  it('fills the edit form from a goal', () => {
    expect(formFromGoal(goal)).toEqual({
      name: 'Viaje',
      categoryId: 'c1',
      reason: 'Other',
      reasonOther: 'Aventura',
      targetAmount: '15000000',
      currencyCode: 'COP',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      status: 'Active',
    });
  });
});
