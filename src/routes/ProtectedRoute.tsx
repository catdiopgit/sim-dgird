import { LoaderCircle } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ProfileProvider } from '../contexts/ProfileContext';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { MotDePassePage } from '../pages/MotDePassePage';
import { useDeconnexionInactivite } from '../hooks/useDeconnexionInactivite';

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  useDeconnexionInactivite(Boolean(session));

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
      <GardeMotDePasse />
    </ProfileProvider>
  );
}

// v8.6.5 : tant que le mot de passe temporaire n'est pas changé, seule la
// page de changement est affichée (le serveur refuse aussi les autres appels).
function GardeMotDePasse() {
  const { profile } = useProfile();
  if (profile?.doit_changer_mot_de_passe) return <MotDePassePage obligatoire />;
  return <Outlet />;
}
