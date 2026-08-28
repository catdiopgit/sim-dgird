import { Spin } from 'antd';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ProfileProvider } from '../contexts/ProfileContext';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
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
