import { passwordChecks } from '../../../domain/passwordRules';
import { Icon } from '../../components/Icon';

// The password rules, always visible. Each one says in text whether it is met (check + "cumplido"), so the state
// never depends on color alone.
export function PasswordRequirements({ id, password }: { id: string; password: string }) {
  return (
    <ul className="pw-reqs" id={id} aria-label="Requisitos de la contraseña">
      {passwordChecks(password).map((check) => (
        <li key={check.id} className={check.met ? 'met' : undefined}>
          <span aria-hidden="true" className="pw-req-mark">
            {check.met ? <Icon name="check" size={14} /> : '•'}
          </span>
          {check.label}
          <span className="sr-only">{check.met ? ' (cumplido)' : ' (pendiente)'}</span>
        </li>
      ))}
    </ul>
  );
}
