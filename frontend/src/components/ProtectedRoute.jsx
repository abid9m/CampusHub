import { Navigate, useLocation } from 'react-router-dom';
import { roleHome, useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="card mx-auto max-w-md text-center text-sm text-zinc-500" role="status">Restoring your session…</div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHome[user.role] || '/'} replace />;
  }
  return children;
}
