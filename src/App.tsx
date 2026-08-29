import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import frFR from 'antd/locale/fr_FR';
import { useEffect, useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useOrganisationBranding } from './hooks/administration/useOrganisationBranding';
import { router } from './routes/AppRouter';
import { buildTheme, resolveBrandColor } from './theme/buildTheme';

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

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary-700', brandColor);
  }, [brandColor]);

  const theme = useMemo(() => buildTheme(brandColor), [brandColor]);

  return (
    <ConfigProvider locale={frFR} theme={theme}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ConfigProvider>
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
