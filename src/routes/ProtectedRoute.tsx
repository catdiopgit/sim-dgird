import { LoaderCircle } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ProfileProvider } from '../contexts/ProfileContext';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div role="status" className="grid min-h-svh place-items-center bg-background">
        <LoaderCircle className="size-8 animate-spin text-primary" aria-hidden />
        <span className="sr-only">Chargement…</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <ProfileProvider>
      <Outlet />
    </ProfileProvider>
  );
}
