import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

// Routes behind login: without a session the user goes to /login and comes back to where they were.
export function ProtectedRoute() {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
