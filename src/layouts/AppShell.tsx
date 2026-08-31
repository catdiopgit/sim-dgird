import {
  BellOutlined,
  CompassOutlined,
  DashboardOutlined,
  FileProtectOutlined,
  FolderOpenOutlined,
  LogoutOutlined,
  MailOutlined,
  ProjectOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Badge, Breadcrumb, Button, Divider, Dropdown, Input, Layout, Menu, Space, theme, Typography } from 'antd';
import { useMemo, useState, type CSSProperties } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SimMonogram } from '../components/branding/SimMonogram';
import { env } from '../config/env';
import { useEcheancesProchaines } from '../hooks/dashboard/useEcheancesProchaines';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';

const { Header, Sider, Content } = Layout;

const navItems = [
  { key: '/', label: 'Tableau de bord', icon: <DashboardOutlined /> },
  { key: '/courriers', label: 'Courriers', icon: <MailOutlined /> },
  { key: '/ged', label: 'GED', icon: <FolderOpenOutlined /> },
  { key: '/projets', label: 'Projets', icon: <ProjectOutlined /> },
  { key: '/missions', label: 'Missions', icon: <CompassOutlined /> },
  { key: '/marches', label: 'Marchés', icon: <FileProtectOutlined /> },
  { key: '/administration', label: 'Administration', icon: <SettingOutlined /> },
];

const labelByPath: Record<string, string> = Object.fromEntries(
  navItems.map((item) => [item.key, item.label]),
);

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { token } = theme.useToken();
  const { data: echeances } = useEcheancesProchaines(30);
  const nombreAlertes = echeances?.filter((e) => e.enRetard).length ?? 0;

  const selectedKey = useMemo(() => {
    const match = navItems.find(
      (item) => item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key),
    );
    return match?.key ?? '/';
  }, [location.pathname]);

  const breadcrumbItems = useMemo(() => {
    const items = [{ title: <Link to="/">SIM</Link> }];
    if (selectedKey !== '/') {
      items.push({ title: <span>{labelByPath[selectedKey]}</span> });
    }
    return items;
  }, [selectedKey]);

  const displayName = profile ? `${profile.prenom} ${profile.nom}`.trim() : user?.email;
  const initials = profile ? `${profile.prenom[0] ?? ''}${profile.nom[0] ?? ''}`.toUpperCase() : null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="light" width={248}>
        <div style={styles.brand}>
          <SimMonogram size={collapsed ? 32 : 40} />
          {!collapsed && (
            <div style={styles.brandText}>
              <span style={{ ...styles.brandWordmark, color: token.colorPrimaryTextActive }}>
                {env.appName}
              </span>
              <span style={styles.brandSubtitle}>Système d'Information Managérial</span>
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ borderInlineEnd: 'none', padding: '8px 0' }}
          items={navItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: <Link to={item.key}>{item.label}</Link>,
          }))}
        />
      </Sider>

      <Layout>
        <Header style={styles.header}>
          <Input.Search
            placeholder="Rechercher un courrier, un document, un projet…"
            style={{ maxWidth: 420 }}
            allowClear
          />
          <Space size={24} align="center">
            <Badge count={nombreAlertes} size="small">
              <Button type="text" shape="circle" icon={<BellOutlined style={{ fontSize: 18 }} />} />
            </Badge>
            <Divider type="vertical" style={{ borderColor: '#E7E9E2', height: 28, margin: 0 }} />
            <Dropdown
              menu={{
                items: [
                  { key: 'signout', icon: <LogoutOutlined />, label: 'Se déconnecter' },
                ],
                onClick: ({ key }) => {
                  if (key === 'signout') {
                    void signOut().then(() => navigate('/login', { replace: true }));
                  }
                },
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: 'pointer' }} size={10}>
                <Avatar
                  style={{ ...styles.avatar, backgroundColor: token.colorPrimaryBg, color: token.colorPrimary }}
                >
                  {initials ?? <UserOutlined />}
                </Avatar>
                <Typography.Text style={styles.userName}>{displayName}</Typography.Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={styles.content}>
          <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 16 }} />
          <div style={styles.contentBody}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

const styles = {
  brand: {
    height: 72,
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderBottom: '1px solid #E7E9E2',
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.2,
    overflow: 'hidden',
  },
  brandWordmark: {
    fontFamily: "'Spectral', Georgia, 'Times New Roman', serif",
    fontWeight: 600,
    fontSize: 18,
    whiteSpace: 'nowrap',
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#838C86',
    whiteSpace: 'nowrap',
  },
  header: {
    background: '#fff',
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #E7E9E2',
  },
  avatar: {
    fontWeight: 600,
    fontSize: 13,
  },
  userName: {
    fontWeight: 600,
    color: '#1A1E1C',
  },
  content: {
    margin: 24,
  },
  contentBody: {
    background: '#fff',
    padding: 24,
    borderRadius: 12,
    minHeight: 'calc(100vh - 180px)',
  },
} satisfies Record<string, CSSProperties>;
