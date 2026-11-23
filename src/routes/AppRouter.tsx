import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { env } from '../config/env';
import { AppShell } from '../layouts/AppShell';
import { ActivationPage } from '../pages/ActivationPage';
import { LoginPage } from '../pages/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';

// v8.8.0 (lot 3) : chargement par module. Chaque écran est téléchargé à la
// première visite au lieu d'un bloc unique de 3 Mo au démarrage.
function charger<T extends Record<string, unknown>>(
  importer: () => Promise<T>,
  nom: keyof T,
): LazyExoticComponent<ComponentType> {
  return lazy(async () => ({ default: (await importer())[nom] as ComponentType }));
}

function Chargement() {
  return <div className="p-8 text-[13px] text-muted-foreground">Chargement…</div>;
}

function ecran(Composant: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={<Chargement />}>
      <Composant />
    </Suspense>
  );
}

const DashboardPage = charger(() => import('../pages/DashboardPage'), 'DashboardPage');
const MotDePassePage = charger(() => import('../pages/MotDePassePage'), 'MotDePassePage');

const CourrierListePage = charger(() => import('../modules/courrier/CourrierListePage'), 'CourrierListePage');
const CourrierNouveauPage = charger(() => import('../modules/courrier/CourrierNouveauPage'), 'CourrierNouveauPage');
const CourrierStatistiquesPage = charger(() => import('../modules/courrier/CourrierStatistiquesPage'), 'CourrierStatistiquesPage');
const CourrierDetailPage = charger(() => import('../modules/courrier/CourrierDetailPage'), 'CourrierDetailPage');

const GedPage = charger(() => import('../modules/ged/GedPage'), 'GedPage');
const ArchivesPage = charger(() => import('../modules/ged/ArchivesPage'), 'ArchivesPage');
const VersementsAutoPage = charger(() => import('../modules/ged/VersementsAutoPage'), 'VersementsAutoPage');
const PlanClassementPage = charger(() => import('../modules/ged/PlanClassementPage'), 'PlanClassementPage');
const VersementDetailPage = charger(() => import('../modules/ged/VersementDetailPage'), 'VersementDetailPage');
const DocumentDetailPage = charger(() => import('../modules/ged/DocumentDetailPage'), 'DocumentDetailPage');

const ProjetsPage = charger(() => import('../modules/projets/ProjetsPage'), 'ProjetsPage');
const ProjetStatistiquesPage = charger(() => import('../modules/projets/ProjetStatistiquesPage'), 'ProjetStatistiquesPage');
const ProjetDetailPage = charger(() => import('../modules/projets/ProjetDetailPage'), 'ProjetDetailPage');

const MarchesPage = charger(() => import('../modules/marches/MarchesPage'), 'MarchesPage');
const MarcheStatistiquesPage = charger(() => import('../modules/marches/MarcheStatistiquesPage'), 'MarcheStatistiquesPage');
const MarcheDetailPage = charger(() => import('../modules/marches/MarcheDetailPage'), 'MarcheDetailPage');

const AdministrationPage = charger(() => import('../modules/administration/AdministrationPage'), 'AdministrationPage');
const OrganisationTab = charger(() => import('../modules/administration/organisation/OrganisationTab'), 'OrganisationTab');
const UtilisateursTab = charger(() => import('../modules/administration/utilisateurs/UtilisateursTab'), 'UtilisateursTab');
const RolesTab = charger(() => import('../modules/administration/roles/RolesTab'), 'RolesTab');
const WorkflowsTab = charger(() => import('../modules/administration/workflows/WorkflowsTab'), 'WorkflowsTab');
const DelegationsTab = charger(() => import('../modules/administration/delegations/DelegationsTab'), 'DelegationsTab');
const ParametrageTab = charger(() => import('../modules/administration/parametrage/ParametrageTab'), 'ParametrageTab');
const AuditTab = charger(() => import('../modules/administration/audit/AuditTab'), 'AuditTab');

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/activation',
    element: <ActivationPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: ecran(DashboardPage) },
          {
            path: 'courriers',
            children: [
              { index: true, element: ecran(CourrierListePage) },
              { path: 'nouveau', element: ecran(CourrierNouveauPage) },
              { path: 'statistiques', element: ecran(CourrierStatistiquesPage) },
              { path: ':id', element: ecran(CourrierDetailPage) },
            ],
          },
          {
            path: 'ged',
            children: [
              { index: true, element: ecran(GedPage) },
              { path: 'archives', element: ecran(ArchivesPage) },
              { path: 'archivage', element: ecran(VersementsAutoPage) },
              { path: 'versements-automatiques', element: ecran(VersementsAutoPage) },
              { path: 'plan-classement', element: ecran(PlanClassementPage) },
              { path: 'versements/:id', element: ecran(VersementDetailPage) },
              { path: 'documents/:id', element: ecran(DocumentDetailPage) },
            ],
          },
          {
            path: 'projets',
            children: [
              { index: true, element: ecran(ProjetsPage) },
              { path: 'statistiques', element: ecran(ProjetStatistiquesPage) },
              { path: ':id', element: ecran(ProjetDetailPage) },
            ],
          },
          {
            path: 'marches',
            children: env.marchesEnabled
              ? [
                  { index: true, element: ecran(MarchesPage) },
                  { path: 'statistiques', element: ecran(MarcheStatistiquesPage) },
                  { path: ':id', element: ecran(MarcheDetailPage) },
                ]
              : [{ path: '*', element: <Navigate to="/" replace /> }],
          },
          { path: 'mon-compte/mot-de-passe', element: ecran(MotDePassePage) },
          {
            path: 'administration',
            element: ecran(AdministrationPage),
            children: [
              { index: true, element: <Navigate to="organisation" replace /> },
              { path: 'organisation', element: ecran(OrganisationTab) },
              { path: 'utilisateurs', element: ecran(UtilisateursTab) },
              { path: 'roles', element: ecran(RolesTab) },
              { path: 'workflows', element: ecran(WorkflowsTab) },
              { path: 'delegations', element: ecran(DelegationsTab) },
              { path: 'parametrage', element: ecran(ParametrageTab) },
              { path: 'audit', element: ecran(AuditTab) },
            ],
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
