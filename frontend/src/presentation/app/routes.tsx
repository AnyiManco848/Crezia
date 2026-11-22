import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { CategoriesPage } from '../features/categories/CategoriesPage';
import { GoalsPage } from '../features/goals/GoalsPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { AccountsPage } from '../features/accounts/AccountsPage';
import { MovementsPage } from '../features/movements/MovementsPage';
import { LoginPage } from '../features/login/LoginPage';
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

// RegisterPendingPage is replaced by the real screen in front-register.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPendingPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/panel" replace />} />
          <Route path="/panel" element={<DashboardPage />} />
          <Route path="/movimientos" element={<MovementsPage />} />
          <Route path="/cuentas" element={<AccountsPage />} />
          <Route path="/metas" element={<GoalsPage />} />
          <Route path="/categorias" element={<CategoriesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
