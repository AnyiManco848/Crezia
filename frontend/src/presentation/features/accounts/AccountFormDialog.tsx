import { useEffect, useRef, useState } from 'react';
import {
  ACCOUNT_FORM_FIELDS,
  emptyAccountForm,
  formFromAccount,
  MAX_ALIAS,
  MAX_BANK_NAME,
  validateAccountForm,
  type AccountFormErrors,
  type AccountFormValues,
} from '../../../application/validation/accountForm';
import { ACCOUNT_TYPE_LABELS, CURRENCY_OPTIONS } from '../../../domain/labels';
import { ACCOUNT_TYPES, type BankAccount } from '../../../domain/types';
import { ApiError, getErrorMessage } from '../../../infrastructure/http/errors';
import { Banner } from '../../components/Banner';
import { Dialog } from '../../components/Dialog';
import { Field } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { useSaveAccount } from './useAccounts';

interface AccountFormDialogProps {
  // null = a new account.
  account: BankAccount | null;
  onClose: () => void;
}

export function AccountFormDialog({ account, onClose }: AccountFormDialogProps) {
  const editing = account !== null;
  const { notify } = useToast();
  const save = useSaveAccount(account?.id ?? null);
  const [values, setValues] = useState<AccountFormValues>(() => (account ? formFromAccount(account) : emptyAccountForm()));
  const [errors, setErrors] = useState<AccountFormErrors>({});
  const [serverMessage, setServerMessage] = useState('');
  const [focusTick, setFocusTick] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  // After a failed submit the focus goes to the first field with an error (and to the banner if there is none).
  useEffect(() => {
    if (focusTick === 0) return;
    bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], .banner')?.focus();
  }, [focusTick]);

  const set = <K extends keyof AccountFormValues>(key: K, value: AccountFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  async function handleSubmit() {
    setServerMessage('');
    const result = validateAccountForm(values, account);
    if (!result.ok) {
      setErrors(result.errors);
      setFocusTick((tick) => tick + 1);
      return;
    }
    setErrors({});
    try {
      await save.mutateAsync(result.payload);
      notify(editing ? 'Cuenta actualizada' : 'Cuenta creada');
      onClose();
    } catch (error) {
      // What the person typed is kept. A 400 marks the fields; a 409 (currency locked by movements) marks the
      // currency; anything else goes to the banner.
      const fieldErrors: AccountFormErrors = {};
      let message = '';
      if (error instanceof ApiError && error.status === 400) {
        const byField = error.fieldErrors();
        for (const field of ACCOUNT_FORM_FIELDS) if (byField[field]) fieldErrors[field] = byField[field];
        if (Object.keys(fieldErrors).length === 0) message = error.message;
      } else if (error instanceof ApiError && error.status === 409) {
        fieldErrors.currencyCode = error.message;
      } else {
        message = getErrorMessage(error);
      }
      setErrors(fieldErrors);
      setServerMessage(message);
      setFocusTick((tick) => tick + 1);
    }
  }

  // An account with a currency outside the known list (created by another client) must still show its own.
  const knownCurrency = CURRENCY_OPTIONS.some((currency) => currency.code === values.currencyCode);

  return (
    <Dialog title={editing ? 'Editar cuenta' : 'Nueva cuenta'} onClose={onClose} onSubmit={() => void handleSubmit()} busy={save.isPending}>
      <div ref={bodyRef}>
        {serverMessage && <Banner kind="error">{serverMessage}</Banner>}
        <div className="form-grid">
          <Field label="Banco" error={errors.bankName}>
            {(control) => (
              <input
                {...control}
                className="input"
                maxLength={MAX_BANK_NAME}
                autoComplete="off"
                value={values.bankName}
                onChange={(event) => set('bankName', event.target.value)}
              />
            )}
          </Field>
          <Field label="Alias (opcional)" error={errors.accountAlias}>
            {(control) => (
              <input
                {...control}
                className="input"
                maxLength={MAX_ALIAS}
                autoComplete="off"
                value={values.accountAlias}
                onChange={(event) => set('accountAlias', event.target.value)}
              />
            )}
          </Field>
          <Field label="Tipo de cuenta" error={errors.accountType}>
            {(control) => (
              <select
                {...control}
                className="select"
                value={values.accountType}
                onChange={(event) => set('accountType', event.target.value as AccountFormValues['accountType'])}
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ACCOUNT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            label="Moneda"
            hint={editing ? 'No se puede cambiar si la cuenta ya tiene movimientos.' : undefined}
            error={errors.currencyCode}
          >
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
        </div>
      </div>
    </Dialog>
  );
}
