import type { ReactNode } from 'react';
import { ThemeToggle } from '../theme/ThemeToggle';
import { Logo } from './Logo';

// Access screens: brand panel on the left (on top in a phone), content on the right, theme switch top right.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth" id="contenido">
      <a className="skip" href="#formulario">
        Saltar al formulario
      </a>
      <aside className="auth-side">
        <Logo />
        <div>
          <div className="wordmark" role="img" aria-label="Crezia">
            CREZIA
          </div>
          <div className="slogan">Finanzas y Ahorro</div>
        </div>
      </aside>
      <div className="auth-theme">
        <ThemeToggle />
      </div>
      <section className="auth-main" id="formulario" tabIndex={-1}>
        {children}
      </section>
    </main>
  );
}
