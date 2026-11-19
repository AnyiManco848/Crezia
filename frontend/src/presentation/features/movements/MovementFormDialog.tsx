import { useEffect, useRef, useState } from 'react';
import {
  emptyMovementForm,
  FORM_FIELDS,
  formFromMovement,
  validateMovementForm,
  type MovementFormErrors,
  type MovementFormValues,
} from '../../../application/validation/movementForm';
import { CURRENCY_OPTIONS, PAYMENT_LABELS, TYPE_LABELS } from '../../../domain/labels';
import { MOVEMENT_TYPES, PAYMENT_METHODS, type BankAccount, type Category, type Movement } from '../../../domain/types';
import { ApiError, getErrorMessage } from '../../../infrastructure/http/errors';
import { Banner } from '../../components/Banner';
import { Dialog } from '../../components/Dialog';
import { Field } from '../../components/Field';
import { LoadingSkeleton } from '../../components/StateBlock';
import { useToast } from '../../components/Toast';
import { accountLabel, MISSING_ACCOUNT_LABEL, MISSING_CATEGORY_LABEL, NO_ACCOUNT_LABEL } from './catalogNames';
import { useSaveMovement } from './useMovements';

interface MovementFormDialogProps {
  // null = a new movement.
  movement: Movement | null;
  categories: Category[];
  accounts: BankAccount[];
  catalogsStatus: 'loading' | 'error' | 'ready';
  onRetryCatalogs: () => void;
  onClose: () => void;
}

// ISO date of "today" in the user's own calendar (not UTC), for the default value of a new movement.
function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function MovementFormDialog({ movement, categories, accounts, catalogsStatus, onRetryCatalogs, onClose }: MovementFormDialogProps) {
  const editing = movement !== null;
  const { notify } = useToast();
  const save = useSaveMovement(movement?.id ?? null);
  const [values, setValues] = useState<MovementFormValues>(() => (movement ? formFromMovement(movement) : emptyMovementForm(today())));
  const [errors, setErrors] = useState<MovementFormErrors>({});
  const [serverMessage, setServerMessage] = useState('');
  const [focusTick, setFocusTick] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  // After a failed submit the focus goes to the first field with an error (and to the banner if there is none).
  useEffect(() => {
    if (focusTick === 0) return;
    const target = bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], .banner');
    target?.focus();
  }, [focusTick]);

  const set = <K extends keyof MovementFormValues>(key: K, value: MovementFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  async function handleSubmit() {
    setServerMessage('');
    const result = validateMovementForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      setFocusTick((tick) => tick + 1);
      return;
    }
    setErrors({});
    try {
      await save.mutateAsync(result.payload);
      notify(editing ? 'Movimiento actualizado' : 'Movimiento guardado');
      onClose();
    } catch (error) {
      // What the person typed is kept. A 400 marks the fields; anything else goes to the banner.
      const fieldErrors: MovementFormErrors = {};
      let message = '';
      if (error instanceof ApiError && error.status === 400) {
        const byField = error.fieldErrors();
        for (const field of FORM_FIELDS) if (byField[field]) fieldErrors[field] = byField[field];
        if (Object.keys(fieldErrors).length === 0) message = error.message;
      } else {
        message = getErrorMessage(error);
      }
      setErrors(fieldErrors);
      setServerMessage(message);
      setFocusTick((tick) => tick + 1);
    }
  }

  const hasAccount = values.bankAccountId !== '';
  const categoryMissing = values.categoryId !== '' && !categories.some((category) => category.id === values.categoryId);
  const accountMissing = hasAccount && !accounts.some((account) => account.id === values.bankAccountId);

  return (
    <Dialog
      title={editing ? 'Editar movimiento' : 'Nuevo movimiento'}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
      busy={save.isPending}
    >
      <div ref={bodyRef}>
        {serverMessage && <Banner kind="error">{serverMessage}</Banner>}

        {catalogsStatus === 'loading' && <LoadingSkeleton label="Cargando categorías y cuentas" rows={2} />}
        {catalogsStatus === 'error' && (
          <div className="banner error" role="alert" tabIndex={-1}>
            <span>
              No pudimos cargar tus categorías y cuentas.{' '}
              <button type="button" className="btn secondary" onClick={onRetryCatalogs}>
                Reintentar
              </button>
            </span>
          </div>
        )}

        {catalogsStatus === 'ready' && (
          <>
            <div className="field">
              <span className="label-text" id="movement-type-label">
                Tipo
              </span>
              <div className="seg" role="radiogroup" aria-labelledby="movement-type-label">
                {MOVEMENT_TYPES.slice()
                  .reverse()
                  .map((type) => (
                    <label key={type}>
                      <input
                        type="radio"
                        name="type"
                        value={type}
                        checked={values.type === type}
                        onChange={() => set('type', type)}
                      />
                      <span>{TYPE_LABELS[type]}</span>
                    </label>
                  ))}
              </div>
            </div>

            <div className="form-grid">
              <Field label="Monto" error={errors.amount}>
                {(control) => (
                  <input
                    {...control}
                    className="input"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    value={values.amount}
                    onChange={(event) => set('amount', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Fecha" error={errors.date}>
                {(control) => (
                  <input {...control} className="input" type="date" value={values.date} onChange={(event) => set('date', event.target.value)} />
                )}
              </Field>
              <Field label="Categoría" error={errors.categoryId}>
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
              <Field label="Cuenta" hint="Con cuenta, la moneda es la de la cuenta." error={errors.bankAccountId}>
                {(control) => (
                  <select {...control} className="select" value={values.bankAccountId} onChange={(event) => set('bankAccountId', event.target.value)}>
                    <option value="">{NO_ACCOUNT_LABEL}</option>
                    {accountMissing && <option value={values.bankAccountId}>{MISSING_ACCOUNT_LABEL}</option>}
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {accountLabel(account)}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Método de pago" error={errors.paymentMethod}>
                {(control) => (
                  <select
                    {...control}
                    className="select"
                    value={values.paymentMethod}
                    onChange={(event) => set('paymentMethod', event.target.value as MovementFormValues['paymentMethod'])}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {PAYMENT_LABELS[method]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              {!hasAccount && (
                <Field label="Moneda" hint="Solo se pide cuando el movimiento no tiene cuenta." error={errors.currencyCode}>
                  {(control) => (
                    <select {...control} className="select" value={values.currencyCode} onChange={(event) => set('currencyCode', event.target.value)}>
                      {CURRENCY_OPTIONS.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.label}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              )}
            </div>

            <Field label="Descripción (opcional)" error={errors.description}>
              {(control) => (
                <input
                  {...control}
                  className="input"
                  maxLength={255}
                  value={values.description}
                  onChange={(event) => set('description', event.target.value)}
                />
              )}
            </Field>
          </>
        )}
      </div>
    </Dialog>
  );
}
