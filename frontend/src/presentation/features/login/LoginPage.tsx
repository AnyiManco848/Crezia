import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { validateLogin, type LoginField } from '../../../application/validation/loginSchema';
import { ApiError, getErrorMessage } from '../../../infrastructure/http/errors';
import { useAuth } from '../../app/useAuth';
import { AuthShell } from '../../components/AuthShell';
import { Banner } from '../../components/Banner';
import { Field } from '../../components/Field';
import { Icon } from '../../components/Icon';

type FieldErrors = Partial<Record<LoginField, string>>;

const DEFAULT_ROUTE = '/panel';

export function LoginPage() {
  const { session, expired, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Iniciar sesión · Crezia';
  }, []);

  useEffect(() => {
    if (serverError) bannerRef.current?.focus();
  }, [serverError]);

  if (session) return <Navigate to={from ?? DEFAULT_ROUTE} replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setServerError(null);

    const result = validateLogin({ email, password });
    setErrors(result.errors);
    if (!result.data) {
      (result.errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await login(result.data);
      navigate(from ?? DEFAULT_ROUTE, { replace: true });
    } catch (error) {
      setSubmitting(false);
      // Backend field errors (400) go under the field; anything else (401, network, 5xx) goes in the banner.
      const fieldErrors = error instanceof ApiError && error.status === 400 ? error.fieldErrors() : {};
      const mapped: FieldErrors = {};
      if (fieldErrors.email) mapped.email = fieldErrors.email;
      if (fieldErrors.password) mapped.password = fieldErrors.password;
      if (Object.keys(mapped).length > 0) setErrors(mapped);
      else setServerError(getErrorMessage(error));
    }
  };

  return (
    <AuthShell>
      <form className="auth-card" onSubmit={onSubmit} noValidate aria-busy={submitting}>
        <h1>Inicia sesión</h1>
        <p className="lead">Ingresa con tu correo y tu contraseña.</p>

        {expired && !serverError && <Banner kind="info">Tu sesión expiró. Inicia sesión de nuevo.</Banner>}
        {serverError && (
          <Banner kind="error" ref={bannerRef}>
            {serverError}
          </Banner>
        )}

        <Field label="Correo electrónico" error={errors.email}>
          {(control) => (
            <input
              {...control}
              ref={emailRef}
              className="input"
              name="email"
              type="email"
              autoComplete="email"
              aria-required="true"
              value={email}
              disabled={submitting}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </Field>

        <Field label="Contraseña" error={errors.password}>
          {(control) => (
            <div className="pw">
              <input
                {...control}
                ref={passwordRef}
                className="input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-required="true"
                value={password}
                disabled={submitting}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} />
              </button>
            </div>
          )}
        </Field>

        <button className="btn block" type="submit" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
        <div className="auth-links">
          <Link to="/registro" className="btn secondary block" style={{ marginTop: 4 }}>
            Registrarse
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
