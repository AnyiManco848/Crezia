import { Link } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';

// The backend has no registration endpoint yet (only POST /api/auth/login), so this screen is not connected.
export function RegisterPendingPage() {
  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Registro</h1>
        <p className="lead">El registro de nuevas cuentas todavía no está disponible.</p>
        <Link className="btn block" to="/login">
          Volver a iniciar sesión
        </Link>
      </div>
    </AuthShell>
  );
}
