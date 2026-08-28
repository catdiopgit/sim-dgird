import { Tabs } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const ONGLETS = [
  { key: 'organisation', label: 'Organisation' },
  { key: 'utilisateurs', label: 'Utilisateurs' },
  { key: 'roles', label: 'Rôles & Permissions' },
  { key: 'workflows', label: 'Workflows' },
  { key: 'delegations', label: 'Délégations' },
  { key: 'parametrage', label: 'Paramétrage' },
  { key: 'audit', label: 'Audit' },
];

export function AdministrationPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const ongletActif = ONGLETS.find((o) => location.pathname.endsWith(`/${o.key}`))?.key ?? 'organisation';

  return (
    <div>
      <Tabs activeKey={ongletActif} items={ONGLETS} onChange={(key) => navigate(key)} />
      <Outlet />
    </div>
  );
}
