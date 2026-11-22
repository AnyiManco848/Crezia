import { useEffect, useRef, useState } from 'react';
import {
  emptyGoalForm,
  formFromGoal,
  GOAL_FORM_FIELDS,
  MAX_GOAL_NAME,
  MAX_REASON_OTHER,
  validateGoalForm,
  type GoalFormErrors,
  type GoalFormValues,
} from '../../../application/validation/goalForm';
import { todayIsoDate } from '../../../domain/dates';
import { CURRENCY_OPTIONS, GOAL_REASON_LABELS, GOAL_STATUS_LABELS } from '../../../domain/labels';
import { GOAL_REASONS, GOAL_STATUSES, type Category, type Goal } from '../../../domain/types';
import { ApiError, getErrorMessage } from '../../../infrastructure/http/errors';
import { Banner } from '../../components/Banner';
import { Dialog } from '../../components/Dialog';
import { Field } from '../../components/Field';
import { LoadingSkeleton } from '../../components/StateBlock';
import { useToast } from '../../components/Toast';
import { MISSING_CATEGORY_LABEL } from '../movements/catalogNames';
import { useSaveGoal } from './useGoals';

interface GoalFormDialogProps {
  // null = a new goal.
  goal: Goal | null;
  categories: Category[];
  catalogsStatus: 'loading' | 'error' | 'ready';
  onRetryCatalogs: () => void;
  onClose: () => void;
}

export function GoalFormDialog({ goal, categories, catalogsStatus, onRetryCatalogs, onClose }: GoalFormDialogProps) {
  const editing = goal !== null;
  const { notify } = useToast();
  const save = useSaveGoal(goal?.id ?? null);
  const [today] = useState(() => todayIsoDate());
  const [values, setValues] = useState<GoalFormValues>(() => (goal ? formFromGoal(goal) : emptyGoalForm(today)));
  const [errors, setErrors] = useState<GoalFormErrors>({});
  const [serverMessage, setServerMessage] = useState('');
  const [focusTick, setFocusTick] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  // After a failed submit the focus goes to the first field with an error (and to the banner if there is none).
  useEffect(() => {
    if (focusTick === 0) return;
    bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], .banner')?.focus();
  }, [focusTick]);

  const set = <K extends keyof GoalFormValues>(key: K, value: GoalFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  async function handleSubmit() {
    setServerMessage('');
    const result = validateGoalForm(values, goal, today);
    if (!result.ok) {
      setErrors(result.errors);
      setFocusTick((tick) => tick + 1);
      return;
    }
    setErrors({});
    try {
      await save.mutateAsync(result.payload);
      notify(editing ? 'Meta actualizada' : 'Meta creada');
      onClose();
    } catch (error) {
      // What the person typed is kept. A 400 marks the fields; a 409 (the category already has an active goal)
      // marks the category; anything else goes to the banner.
      const fieldErrors: GoalFormErrors = {};
      let message = '';
      if (error instanceof ApiError && error.status === 400) {
        const byField = error.fieldErrors();
        for (const field of GOAL_FORM_FIELDS) if (byField[field]) fieldErrors[field] = byField[field];
        if (Object.keys(fieldErrors).length === 0) message = error.message;
      } else if (error instanceof ApiError && error.status === 409) {
        fieldErrors.categoryId = error.message;
      } else {
        message = getErrorMessage(error);
      }
      setErrors(fieldErrors);
      setServerMessage(message);
      setFocusTick((tick) => tick + 1);
    }
  }

  const categoryMissing = values.categoryId !== '' && !categories.some((category) => category.id === values.categoryId);
  // A currency outside the known list (created by another client) must still show its own.
  const knownCurrency = CURRENCY_OPTIONS.some((currency) => currency.code === values.currencyCode);

  return (
    <Dialog
      title={editing ? 'Editar meta' : 'Nueva meta'}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
      busy={save.isPending}
    >
      <div ref={bodyRef}>
        {serverMessage && <Banner kind="error">{serverMessage}</Banner>}

        {catalogsStatus === 'loading' && <LoadingSkeleton label="Cargando categorías" rows={2} />}
        {catalogsStatus === 'error' && (
          <div className="banner error" role="alert" tabIndex={-1}>
            <span>
              No pudimos cargar tus categorías.{' '}
              <button type="button" className="btn secondary" onClick={onRetryCatalogs}>
                Reintentar
              </button>
            </span>
          </div>
        )}

        {catalogsStatus === 'ready' && (
          <div className="form-grid">
            <div className="full">
              <Field label="Nombre" error={errors.name}>
                {(control) => (
                  <input {...control} className="input" maxLength={MAX_GOAL_NAME} autoComplete="off" value={values.name} onChange={(event) => set('name', event.target.value)} />
                )}
              </Field>
            </div>
            <Field
              label="Categoría"
              hint="Los gastos de esta categoría, dentro de las fechas de la meta, cuentan como avance."
              error={errors.categoryId}
            >
              {(control) => (
                <select {...control} className="select" value={values.categoryId} onChange={(event) => set('categoryId', event.target.value)}>
                  <option value="">Selecciona una categoría</option>
                  {categoryMissing && <option value={values.categoryId}>{MISSING_CATEGORY_LABEL}</option>}
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Motivo" error={errors.reason}>
              {(control) => (
                <select {...control} className="select" value={values.reason} onChange={(event) => set('reason', event.target.value as GoalFormValues['reason'])}>
                  {GOAL_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {GOAL_REASON_LABELS[reason]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            {values.reason === 'Other' && (
              <div className="full">
                <Field label="Describe el motivo" error={errors.reasonOther}>
                  {(control) => (
                    <input
                      {...control}
                      className="input"
                      maxLength={MAX_REASON_OTHER}
                      autoComplete="off"
                      value={values.reasonOther}
                      onChange={(event) => set('reasonOther', event.target.value)}
                    />
                  )}
                </Field>
              </div>
            )}
            <Field label="Monto objetivo" hint="Sin puntos de miles. En pesos, sin decimales." error={errors.targetAmount}>
              {(control) => (
                <input {...control} className="input" inputMode="decimal" autoComplete="off" value={values.targetAmount} onChange={(event) => set('targetAmount', event.target.value)} />
              )}
            </Field>
            <Field label="Moneda" error={errors.currencyCode}>
              {(control) => (
                <select {...control} className="select" value={values.currencyCode} onChange={(event) => set('currencyCode', event.target.value)}>
                  {!knownCurrency && <option value={values.currencyCode}>{values.currencyCode}</option>}
                  {CURRENCY_OPTIONS.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Fecha de inicio" error={errors.startDate}>
              {(control) => <input {...control} className="input" type="date" value={values.startDate} onChange={(event) => set('startDate', event.target.value)} />}
            </Field>
            <Field label="Fecha de fin" error={errors.endDate}>
              {(control) => <input {...control} className="input" type="date" value={values.endDate} onChange={(event) => set('endDate', event.target.value)} />}
            </Field>
            {editing && (
              <Field label="Estado" error={errors.status}>
                {(control) => (
                  <select {...control} className="select" value={values.status} onChange={(event) => set('status', event.target.value as GoalFormValues['status'])}>
                    {GOAL_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {GOAL_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
