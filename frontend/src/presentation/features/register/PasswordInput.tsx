import { useState } from 'react';
import type { FieldControlProps } from '../../components/Field';
import { Icon } from '../../components/Icon';

interface PasswordInputProps {
  control: FieldControlProps;
  name: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  // Accessible name of the toggle: "contraseña" or "confirmación de contraseña".
  toggleSubject: string;
  // Extra id(s) the input is described by (the visible requirements).
  describedBy?: string;
}

// Password field with a show/hide button (a real button with aria-pressed and a changing name).
export function PasswordInput({ control, name, value, disabled, onChange, toggleSubject, describedBy }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const described = [control['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined;

  return (
    <div className="pw">
      <input
        {...control}
        aria-describedby={described}
        className="input"
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        aria-required="true"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="icon-btn"
        aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${toggleSubject}`}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} />
      </button>
    </div>
  );
}
