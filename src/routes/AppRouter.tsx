import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { AdministrationPage } from '../modules/administration/AdministrationPage';
import { AuditTab } from '../modules/administration/audit/AuditTab';
import { DelegationsTab } from '../modules/administration/delegations/DelegationsTab';
import { OrganisationTab } from '../modules/administration/organisation/OrganisationTab';
import { ParametrageTab } from '../modules/administration/parametrage/ParametrageTab';
import { RolesTab } from '../modules/administration/roles/RolesTab';
import { UtilisateursTab } from '../modules/administration/utilisateurs/UtilisateursTab';
import { WorkflowsTab } from '../modules/administration/workflows/WorkflowsTab';
import { CourrierDetailPage } from '../modules/courrier/CourrierDetailPage';
import { CourrierListePage } from '../modules/courrier/CourrierListePage';
import { CourrierStatistiquesPage } from '../modules/courrier/CourrierStatistiquesPage';
import { ArchivesPage } from '../modules/ged/ArchivesPage';
import { ArchivagePage } from '../modules/ged/archivage/ArchivagePage';
import { DocumentDetailPage } from '../modules/ged/DocumentDetailPage';
import { GedPage } from '../modules/ged/GedPage';
import { VersementDetailPage } from '../modules/ged/VersementDetailPage';
import { MissionDetailPage } from '../modules/missions/MissionDetailPage';
import { MissionStatistiquesPage } from '../modules/missions/MissionStatistiquesPage';
import { MissionsPage } from '../modules/missions/MissionsPage';
import { ProjetDetailPage } from '../modules/projets/ProjetDetailPage';
import { ProjetStatistiquesPage } from '../modules/projets/ProjetStatistiquesPage';
import { ProjetsPage } from '../modules/projets/ProjetsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: 'courriers',
            children: [
              { index: true, element: <CourrierListePage /> },
              { path: 'statistiques', element: <CourrierStatistiquesPage /> },
              { path: ':id', element: <CourrierDetailPage /> },
            ],
          },
          {
            path: 'ged',
            children: [
              { index: true, element: <GedPage /> },
              { path: 'archives', element: <ArchivesPage /> },
              { path: 'archivage', element: <ArchivagePage /> },
              { path: 'versements/:id', element: <VersementDetailPage /> },
              { path: 'documents/:id', element: <DocumentDetailPage /> },
            ],
          },
          {
            path: 'projets',
            children: [
              { index: true, element: <ProjetsPage /> },
              { path: 'statistiques', element: <ProjetStatistiquesPage /> },
              { path: ':id', element: <ProjetDetailPage /> },
            ],
          },
          {
            path: 'missions',
            children: [
              { index: true, element: <MissionsPage /> },
              { path: 'statistiques', element: <MissionStatistiquesPage /> },
              { path: ':id', element: <MissionDetailPage /> },
            ],
          },
          {
            path: 'administration',
            element: <AdministrationPage />,
            children: [
              { index: true, element: <Navigate to="organisation" replace /> },
              { path: 'organisation', element: <OrganisationTab /> },
              { path: 'utilisateurs', element: <UtilisateursTab /> },
              { path: 'roles', element: <RolesTab /> },
              { path: 'workflows', element: <WorkflowsTab /> },
              { path: 'delegations', element: <DelegationsTab /> },
              { path: 'parametrage', element: <ParametrageTab /> },
              { path: 'audit', element: <AuditTab /> },
            ],
          },
        ],
      },
    ],
  },
]);
