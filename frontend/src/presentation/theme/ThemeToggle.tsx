import { useId } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { useTheme } from './ThemeProvider';
import type { ThemeMode } from './themeStorage';

const OPTIONS: ReadonlyArray<{ value: ThemeMode; label: string; icon: IconName }> = [
  { value: 'light', label: 'Claro', icon: 'sun' },
  { value: 'dark', label: 'Oscuro', icon: 'moon' },
  { value: 'system', label: 'Sistema', icon: 'monitor' },
];

// Small three-icon switch (light / dark / system). Native radios: arrow keys move between options.
export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const name = useId();

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Tema de color">
      {OPTIONS.map((option) => (
        <label key={option.value} title={option.label}>
          <input
            type="radio"
            name={name}
            value={option.value}
            aria-label={option.label}
            checked={mode === option.value}
            onChange={() => setMode(option.value)}
          />
          <span className="tt">
            <Icon name={option.icon} />
          </span>
        </label>
      ))}
    </div>
  );
}
