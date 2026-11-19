import { describe, expect, it } from 'vitest';
import type { Movement } from '../../domain/types';
import { emptyMovementForm, formFromMovement, validateMovementForm, type MovementFormValues } from './movementForm';

const CATEGORY = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const ACCOUNT = '3b241101-e2bb-4255-8caf-4136c566a962';

const valid = (overrides: Partial<MovementFormValues> = {}): MovementFormValues => ({
  ...emptyMovementForm('2026-11-18'),
  amount: '85000',
  categoryId: CATEGORY,
  ...overrides,
});

describe('validateMovementForm', () => {
  it('builds the payload of a movement without account, with its currency', () => {
    const result = validateMovementForm(valid({ description: '  Mercado  ', currencyCode: 'USD' }));

    expect(result).toEqual({
      ok: true,
      payload: {
        type: 'Expense',
        amount: '85000',
        date: '2026-11-18',
        categoryId: CATEGORY,
        bankAccountId: null,
        paymentMethod: 'Cash',
        description: 'Mercado',
        currencyCode: 'USD',
      },
    });
  });

  it('does not send the currency when there is an account (the API uses the account one)', () => {
    const result = validateMovementForm(valid({ bankAccountId: ACCOUNT, currencyCode: 'USD' }));

    expect(result.ok && result.payload).toMatchObject({ bankAccountId: ACCOUNT });
    expect(result.ok && 'currencyCode' in result.payload).toBe(false);
  });

  it('turns an empty description into null and a comma amount into a decimal string', () => {
    const result = validateMovementForm(valid({ amount: '85000,5', description: '   ' }));

    expect(result.ok && result.payload).toMatchObject({ amount: '85000.5', description: null });
  });

  it('reports every missing or invalid field in Spanish', () => {
    const result = validateMovementForm(valid({ amount: '0', date: '', categoryId: '', description: 'x'.repeat(256) }));

    expect(result).toEqual({
      ok: false,
      errors: {
        amount: 'El monto debe ser mayor a 0',
        date: 'La fecha es obligatoria',
        categoryId: 'Selecciona una categoría',
        description: 'La descripción no puede superar 255 caracteres',
      },
    });
  });

  it('rejects an impossible date', () => {
    const result = validateMovementForm(valid({ date: '2026-02-30' }));

    expect(!result.ok && result.errors.date).toBe('La fecha no es válida');
  });

  it('rejects the ambiguous thousands amount instead of guessing', () => {
    const result = validateMovementForm(valid({ amount: '85.000' }));

    expect(!result.ok && result.errors.amount).toContain('sin separador de miles');
  });
});

describe('formFromMovement', () => {
  const movement: Movement = {
    id: 'm1',
    bankAccountId: null,
    categoryId: CATEGORY,
    type: 'Income',
    amount: '3500000.50',
    currencyCode: 'USD',
    date: '2026-11-01',
    paymentMethod: 'Transfer',
    description: null,
  };

  it('prefills the edit form from the movement', () => {
    expect(formFromMovement(movement)).toEqual({
      type: 'Income',
      amount: '3500000,5',
      date: '2026-11-01',
      categoryId: CATEGORY,
      bankAccountId: '',
      paymentMethod: 'Transfer',
      currencyCode: 'USD',
      description: '',
    });
  });

  it('survives a round trip through validation', () => {
    const result = validateMovementForm(formFromMovement(movement));

    expect(result.ok && result.payload).toMatchObject({ amount: '3500000.5', currencyCode: 'USD', bankAccountId: null });
  });
});
