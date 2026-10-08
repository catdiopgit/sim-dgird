import { useMemo } from 'react';
import { useEcheancesProchaines } from '../hooks/dashboard/useEcheancesProchaines';
import { useStatistiquesCourrier } from '../hooks/courrier/useStatistiquesCourrier';
import { useStatistiquesMissions } from '../hooks/missions/useStatistiquesMissions';
import { useStatistiquesProjets } from '../hooks/projets/useStatistiquesProjets';
import { useProfile } from '../hooks/useProfile';
import { ActionRequiredPanel } from '../modules/dashboard/ActionRequiredPanel';
import { CourrierEvolutionChart } from '../modules/dashboard/CourrierEvolutionChart';
import { DashboardHeader } from '../modules/dashboard/DashboardHeader';
import { KpiGrid } from '../modules/dashboard/KpiGrid';
import { MailStatusBreakdown } from '../modules/dashboard/MailStatusBreakdown';
import { MissionStatusBars } from '../modules/dashboard/MissionStatusBars';
import { formatDate, periodePrecedente } from '../modules/dashboard/periode';
import { ProjectStatusBars } from '../modules/dashboard/ProjectStatusBars';
import { ProjetsFinancierCard } from '../modules/dashboard/ProjetsFinancierCard';
import { RecentActivityPanel } from '../modules/dashboard/RecentActivityPanel';
import { UpcomingDeadlinesPanel } from '../modules/dashboard/UpcomingDeadlinesPanel';
import { usePeriodeStore } from '../modules/dashboard/usePeriodeStore';

// Refonte v2 (documentation/Tableau de bord v2.txt) puis refonte visuelle
// (redesign-maquette/) : cockpit de pilotage respectant l'architecture
// existante — chaque module garde sa propre fonction de statistiques serveur
// (fn_statistiques_*), ce composant les compose sans dupliquer de logique
// métier. La période est choisie dans le header global (usePeriodeStore).
export function DashboardPage() {
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const periode = usePeriodeStore((s) => s.periode);
  const precedente = useMemo(() => periodePrecedente(periode), [periode]);

  const dateDebut = formatDate(periode.debut);
  const dateFin = formatDate(periode.fin);
  const dateDebutPrecedente = formatDate(precedente.debut);
  const dateFinPrecedente = formatDate(precedente.fin);

  const { data: courrier, isLoading: chargementCourrier } = useStatistiquesCourrier(dateDebut, dateFin);
  const { data: courrierPrecedent } = useStatistiquesCourrier(dateDebutPrecedente, dateFinPrecedente);

  const { data: projets, isLoading: chargementProjets } = useStatistiquesProjets({ dateDebut, dateFin });
  const { data: projetsPrecedents } = useStatistiquesProjets({ dateDebut: dateDebutPrecedente, dateFin: dateFinPrecedente });
  const { data: missions, isLoading: chargementMissions } = useStatistiquesMissions({ dateDebut, dateFin });
  const { data: missionsPrecedentes } = useStatistiquesMissions({ dateDebut: dateDebutPrecedente, dateFin: dateFinPrecedente });

  const { data: echeances, isLoading: chargementEcheances } = useEcheancesProchaines(30);

  const peutVoirActivite = can('administration', 'consulter');

  return (
    <div className="space-y-6">
      <DashboardHeader periode={periode} />

      <KpiGrid
        courrier={{ data: courrier, dataPrecedente: courrierPrecedent, loading: chargementCourrier }}
        projets={{ data: projets, dataPrecedente: projetsPrecedents, loading: chargementProjets }}
        missions={{ data: missions, dataPrecedente: missionsPrecedentes, loading: chargementMissions }}
        echeances={{ data: echeances, loading: chargementEcheances }}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <CourrierEvolutionChart evolution={courrier?.evolution} debut={periode.debut} fin={periode.fin} chargement={chargementCourrier} />
        <MailStatusBreakdown parEtat={courrier?.parEtat} delaiMoyenJours={courrier?.delaiMoyenJours} chargement={chargementCourrier} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ProjectStatusBars parEtat={projets?.parEtat} />
        <MissionStatusBars parEtape={missions?.parEtape} />
        <ProjetsFinancierCard projets={projets} chargement={chargementProjets} />
      </div>

      <div className={`grid grid-cols-1 gap-4 ${peutVoirActivite ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
        <ActionRequiredPanel courrier={courrier} projets={projets} missions={missions} echeances={echeances} />
        <UpcomingDeadlinesPanel echeances={echeances} chargement={chargementEcheances} />
        {peutVoirActivite && <RecentActivityPanel organisationId={organisationId} />}
      </div>
    </div>
  );
}
