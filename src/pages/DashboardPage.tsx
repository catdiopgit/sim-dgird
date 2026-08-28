import { Col, Row, Space } from 'antd';
import { useMemo, useState } from 'react';
import { useEcheancesProchaines } from '../hooks/dashboard/useEcheancesProchaines';
import { useStatistiquesCourrier } from '../hooks/courrier/useStatistiquesCourrier';
import { useStatistiquesMissions } from '../hooks/missions/useStatistiquesMissions';
import { useStatistiquesProjets } from '../hooks/projets/useStatistiquesProjets';
import { useProfile } from '../hooks/useProfile';
import { ActionRequiredPanel } from '../modules/dashboard/ActionRequiredPanel';
import { AlertsPanel } from '../modules/dashboard/AlertsPanel';
import { DashboardHeader } from '../modules/dashboard/DashboardHeader';
import { KpiGrid } from '../modules/dashboard/KpiGrid';
import { MailStatusDonut } from '../modules/dashboard/MailStatusDonut';
import { MissionStatusBars } from '../modules/dashboard/MissionStatusBars';
import { formatDate, periodeDepuisPreset, periodePrecedente } from '../modules/dashboard/periode';
import { ProjectStatusBars } from '../modules/dashboard/ProjectStatusBars';
import { QuickActions } from '../modules/dashboard/QuickActions';
import { RecentActivityPanel } from '../modules/dashboard/RecentActivityPanel';
import { UpcomingDeadlinesPanel } from '../modules/dashboard/UpcomingDeadlinesPanel';

// Refonte v2 (documentation/Tableau de bord v2.txt) : cockpit de pilotage
// respectant l'architecture existante — chaque module garde sa propre
// fonction de statistiques serveur (fn_statistiques_*), ce composant les
// compose sans dupliquer de logique métier.
export function DashboardPage() {
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const [periode, setPeriode] = useState(() => periodeDepuisPreset('mois'));
  const precedente = useMemo(() => periodePrecedente(periode), [periode]);

  const dateDebut = formatDate(periode.debut);
  const dateFin = formatDate(periode.fin);
  const dateDebutPrecedente = formatDate(precedente.debut);
  const dateFinPrecedente = formatDate(precedente.fin);

  const { data: courrier, isLoading: chargementCourrier } = useStatistiquesCourrier(dateDebut, dateFin);
  const { data: courrierPrecedent } = useStatistiquesCourrier(dateDebutPrecedente, dateFinPrecedente);

  const { data: projets, isLoading: chargementProjets } = useStatistiquesProjets({ dateDebut, dateFin });
  const { data: missions, isLoading: chargementMissions } = useStatistiquesMissions({ dateDebut, dateFin });

  const { data: echeances, isLoading: chargementEcheances } = useEcheancesProchaines(30);

  const peutVoirActivite = can('administration', 'consulter');

  return (
    <div>
      <DashboardHeader periode={periode} onChangePeriode={setPeriode} />

      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <QuickActions />

        <KpiGrid
          courrier={{ data: courrier, dataPrecedente: courrierPrecedent, loading: chargementCourrier }}
          projets={{ data: projets, loading: chargementProjets }}
          missions={{ data: missions, loading: chargementMissions }}
          echeances={{ data: echeances, loading: chargementEcheances }}
        />

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <MailStatusDonut parEtat={courrier?.parEtat} />
          </Col>
          <Col xs={24} lg={8}>
            <ProjectStatusBars parEtat={projets?.parEtat} />
          </Col>
          <Col xs={24} lg={8}>
            <MissionStatusBars parEtape={missions?.parEtape} />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <ActionRequiredPanel courrier={courrier} projets={projets} missions={missions} echeances={echeances} />
          </Col>
          <Col xs={24} lg={12}>
            <AlertsPanel echeances={echeances} chargement={chargementEcheances} />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {peutVoirActivite && (
            <Col xs={24} lg={12}>
              <RecentActivityPanel organisationId={organisationId} />
            </Col>
          )}
          <Col xs={24} lg={peutVoirActivite ? 12 : 24}>
            <UpcomingDeadlinesPanel echeances={echeances} chargement={chargementEcheances} />
          </Col>
        </Row>
      </Space>
    </div>
  );
}
