import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  REGISTER_FIELDS,
  validateRegister,
  type RegisterErrors,
  type RegisterField,
  type RegisterFormValues,
} from '../../../application/validation/registerSchema';
import { latestAdultBirthDate } from '../../../domain/dates';
import { ApiError, getErrorMessage } from '../../../infrastructure/http/errors';
import { useAuth } from '../../app/useAuth';
import { AuthShell } from '../../components/AuthShell';
import { Banner } from '../../components/Banner';
import { Field } from '../../components/Field';
import { PasswordInput } from './PasswordInput';
import { PasswordRequirements } from './PasswordRequirements';

const DEFAULT_ROUTE = '/panel';

const EMPTY: RegisterFormValues = { name: '', documentId: '', birthDate: '', email: '', phone: '', password: '', confirmPassword: '' };

// Fields the API can mark in a 400 (the confirmation never reaches it).
const SERVER_FIELDS: readonly RegisterField[] = REGISTER_FIELDS.filter((field) => field !== 'confirmPassword');

// Seconds left until `until` (a Date.now() value), never below 0.
const secondsLeft = (until: number) => Math.max(0, Math.ceil((until - Date.now()) / 1000));

export function RegisterPage() {
  const { session, register } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState<RegisterFormValues>(EMPTY);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 429 with a readable Retry-After: the moment (Date.now()) when the button comes back, and the seconds left.
  const [retryUntil, setRetryUntil] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [focusTick, setFocusTick] = useState(0);

  const formRef = useRef<HTMLFormElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const requirementsId = useId();
  const maxBirthDate = latestAdultBirthDate();

  useEffect(() => {
    document.title = 'Crea tu cuenta · Crezia';
  }, []);

  // After a failed submit the focus goes to the first field with an error, or to the banner when there is none.
  useEffect(() => {
    if (focusTick === 0) return;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (invalid ?? bannerRef.current)?.focus();
  }, [focusTick]);

  // Countdown of the 429. It updates the button label only; the banner keeps its text so a screen reader is not
  // interrupted every second.
  useEffect(() => {
    if (retryUntil === null) return;
    const tick = () => {
      const left = secondsLeft(retryUntil);
      setRemaining(left);
      if (left === 0) {
        setRetryUntil(null);
        setServerError(null);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  if (session) return <Navigate to={DEFAULT_ROUTE} replace />;

  const blocked = retryUntil !== null;

  const set = (field: RegisterField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || blocked) return;
    setServerError(null);

    const result = validateRegister(values);
    setErrors(result.errors);
    if (!result.data) {
      setFocusTick((tick) => tick + 1);
      return;
    }

    setSubmitting(true);
    try {
      await register(result.data);
      navigate(DEFAULT_ROUTE, { replace: true });
    } catch (error) {
      setSubmitting(false);
      if (error instanceof ApiError && error.status === 400) {
        // The API's own field errors go under the fields. What the person typed is kept.
        const byField = error.fieldErrors();
        const mapped: RegisterErrors = {};
        for (const field of SERVER_FIELDS) if (byField[field]) mapped[field] = byField[field];
        setErrors(mapped);
        setServerError(Object.keys(mapped).length > 0 ? null : error.message);
      } else if (error instanceof ApiError && error.status === 429 && error.retryAfterSeconds !== null && error.retryAfterSeconds > 0) {
        // The wait is fixed in the banner text when it starts; only the button counts down.
        setServerError(`Demasiados intentos. Podrás intentarlo de nuevo en ${error.retryAfterSeconds} segundos.`);
        setRetryUntil(Date.now() + error.retryAfterSeconds * 1000);
        setRemaining(error.retryAfterSeconds);
      } else {
        // 409 shows the API's generic message as is (it does not say which datum exists); 429 without a readable
        // Retry-After shows the API's generic text; network errors and 5xx show their own Spanish message.
        setServerError(getErrorMessage(error));
      }
      setFocusTick((tick) => tick + 1);
    }
  };

  return (
    <AuthShell>
      <form ref={formRef} className="auth-card wide" onSubmit={onSubmit} noValidate aria-busy={submitting}>
        <h1>Crea tu cuenta</h1>
        <p className="lead">Completa tus datos para empezar.</p>

        {serverError && (
          <Banner kind="error" ref={bannerRef}>
            {serverError}
          </Banner>
        )}

        <div className="form-grid">
          <div className="full">
            <Field label="Nombre completo" error={errors.name}>
              {(control) => (
                <input
                  {...control}
                  className="input"
                  name="name"
                  autoComplete="name"
                  aria-required="true"
                  maxLength={120}
                  value={values.name}
                  disabled={submitting}
                  onChange={(event) => set('name', event.target.value)}
                />
              )}
            </Field>
          </div>
          <Field label="Identificación (cédula)" error={errors.documentId}>
            {(control) => (
              <input
                {...control}
                className="input"
                name="documentId"
                autoComplete="off"
                aria-required="true"
                maxLength={20}
                value={values.documentId}
                disabled={submitting}
                onChange={(event) => set('documentId', event.target.value)}
              />
            )}
          </Field>
          <Field label="Fecha de nacimiento" hint="Debes tener 18 años o más." error={errors.birthDate}>
            {(control) => (
              <input
                {...control}
                className="input"
                name="birthDate"
                type="date"
                autoComplete="bday"
                aria-required="true"
                max={maxBirthDate}
                value={values.birthDate}
                disabled={submitting}
                onChange={(event) => set('birthDate', event.target.value)}
              />
            )}
          </Field>
          <div className="full">
            <Field label="Correo electrónico" hint="Se guarda en minúsculas." error={errors.email}>
              {(control) => (
                <input
                  {...control}
                  className="input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  aria-required="true"
                  value={values.email}
                  disabled={submitting}
                  onChange={(event) => set('email', event.target.value)}
                />
              )}
            </Field>
          </div>
          <div className="full">
            <Field label="Teléfono celular (opcional)" error={errors.phone}>
              {(control) => (
                <input
                  {...control}
                  className="input"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={20}
                  value={values.phone}
                  disabled={submitting}
                  onChange={(event) => set('phone', event.target.value)}
                />
              )}
            </Field>
          </div>
          <div className="full">
            <Field label="Contraseña" error={errors.password}>
              {(control) => (
                <>
                  <PasswordInput
                    control={control}
                    name="password"
                    value={values.password}
                    disabled={submitting}
                    describedBy={requirementsId}
                    toggleSubject="contraseña"
                    onChange={(value) => set('password', value)}
                  />
                  <PasswordRequirements id={requirementsId} password={values.password} />
                </>
              )}
            </Field>
          </div>
          <div className="full">
            <Field label="Confirmar contraseña" error={errors.confirmPassword}>
              {(control) => (
                <PasswordInput
                  control={control}
                  name="confirmPassword"
                  value={values.confirmPassword}
                  disabled={submitting}
                  toggleSubject="confirmación de contraseña"
                  onChange={(value) => set('confirmPassword', value)}
                />
              )}
            </Field>
          </div>
        </div>

        <button className="btn block" type="submit" disabled={submitting || blocked}>
          {submitting ? 'Creando cuenta…' : blocked ? `Intenta de nuevo en ${remaining} s` : 'Crear cuenta'}
        </button>
        <div className="auth-links">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </div>
      </form>
    </AuthShell>
  );
}
