import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Notifications } from './components/ui/notifications';
import { AuthProvider } from './contexts/AuthContext';
import { useOrganisationBranding } from './hooks/administration/useOrganisationBranding';
import { router } from './routes/AppRouter';
import { useUiPreferences } from './stores/uiPreferences';
import { brandColorForMode, resolveBrandColor } from './theme/couleurMarque';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function ThemedApp() {
  const { data: branding } = useOrganisationBranding();
  const brandColor = resolveBrandColor(branding?.couleur_primaire);
  const themeMode = useUiPreferences((s) => s.themeMode);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', themeMode === 'dark');
    // Page de connexion : couleur institutionnelle brute, quel que soit le mode.
    root.style.setProperty('--color-primary-700', brandColor);
    // Tokens shadcn (src/index.css) : la couleur de l'organisation remplace le
    // vert par défaut, éclaircie en mode sombre.
    const primary = brandColorForMode(brandColor, themeMode);
    for (const token of ['--primary', '--ring', '--chart-1']) root.style.setProperty(token, primary);
  }, [brandColor, themeMode]);

  return (
    <>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
      <Notifications />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemedApp />
    </QueryClientProvider>
  );
}

export default App;
