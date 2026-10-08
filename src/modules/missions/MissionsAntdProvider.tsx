import { ConfigProvider } from 'antd';
import frFR from 'antd/locale/fr_FR';
import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { useOrganisationBranding } from '../../hooks/administration/useOrganisationBranding';
import { buildTheme } from '../../theme/buildTheme';
import { resolveBrandColor } from '../../theme/couleurMarque';

// Le module Missions (masqué) n'a pas été porté sur le nouveau design : ses
// écrans restent en antd, thème appliqué uniquement sur ses routes.
export function MissionsAntdProvider() {
  const { data: branding } = useOrganisationBranding();
  const brandColor = resolveBrandColor(branding?.couleur_primaire);
  const theme = useMemo(() => buildTheme(brandColor), [brandColor]);
  return (
    <ConfigProvider locale={frFR} theme={theme}>
      <Outlet />
    </ConfigProvider>
  );
}
