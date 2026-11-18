import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { LoginPage } from '../features/login/LoginPage';
import { PendingPage } from '../features/pending/PendingPage';
import { RegisterPendingPage } from '../features/pending/RegisterPendingPage';
import { AppLayout } from '../layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';

function NotFoundPage() {
  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Página no encontrada</h1>
        <p className="lead">La dirección que escribiste no existe.</p>
        <Link className="btn block" to="/panel">
          Ir al Panel
        </Link>
      </div>
    </AuthShell>
  );
}

// Each PendingPage is replaced by its real screen in its own part (front-dashboard, front-movements...).
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPendingPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/panel" replace />} />
          <Route path="/panel" element={<PendingPage title="Panel" />} />
          <Route path="/movimientos" element={<PendingPage title="Movimientos" />} />
          <Route path="/cuentas" element={<PendingPage title="Cuentas" />} />
          <Route path="/metas" element={<PendingPage title="Metas" />} />
          <Route path="/categorias" element={<PendingPage title="Categorías" />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
